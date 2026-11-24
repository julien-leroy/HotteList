"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmAccount, resendAccountCode, startAccount, switchToLogin } from "@/app/actions/guest";
import { CodeInput } from "./code-flow";
import { InfoTip } from "./info-tip";

function Alert({ text, tone = "error" }: { text: string; tone?: "error" | "info" }) {
  const s =
    tone === "error"
      ? { background: "#F8E6E6", border: "1px solid #E7B9BC", color: "#8A2730" }
      : { background: "#E8F1EB", border: "1px solid #9CC2AC", color: "#1F5539" };
  return (
    <p role={tone === "error" ? "alert" : "status"} className="m-0 rounded-xl px-3.5 py-2.5 text-sm font-semibold" style={s}>
      {text}
    </p>
  );
}

/** Un invité crée son compte : adresse e-mail + mot de passe, puis le code reçu. Il garde sa liste et ses familles. */
export function AccountUpgrade({
  mail,
  next,
  pendingEmail,
  autoFocus = true,
}: {
  mail: boolean;
  next: string;
  pendingEmail: string | null;
  /** faux dans le profil : la page ne doit pas sauter jusqu'au formulaire */
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "code">(pendingEmail ? "code" : "form");
  const [id, setId] = useState(pendingEmail ?? "");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState(pendingEmail ?? "");
  const [error, setError] = useState<string | null>(null);
  const [exists, setExists] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function done() {
    router.push(next);
    router.refresh();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setExists(false);
    if (pw !== pw2) return setError("Les deux mots de passe ne correspondent pas.");
    start(async () => {
      const r = await startAccount(id, pw);
      if (!r.ok) {
        if (r.error === "EXISTS") {
          setExists(true);
          return setError("Un compte existe déjà avec cette adresse.");
        }
        return setError(r.error);
      }
      if (!mail) return done();
      setSentTo(r.message ?? id);
      setCode("");
      setStep("code");
    });
  }

  function confirm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await confirmAccount(code);
      if (!r.ok) return setError(r.error);
      done();
    });
  }

  if (step === "code") {
    return (
      <form onSubmit={confirm} className="flex flex-col gap-[18px]">
        <Alert tone="info" text={info ?? `Code envoyé à ${sentTo}. Pensez à regarder dans les spams.`} />
        <div className="flex flex-col gap-1.5">
          <label className="label" htmlFor="code">Code à 6 chiffres</label>
          <CodeInput value={code} onChange={setCode} />
        </div>
        {error && <Alert text={error} />}
        <button className="btn b-primary w-full" disabled={pending} style={{ minHeight: 48, fontSize: 15 }}>
          {pending ? "Vérification…" : "Valider mon compte"}
        </button>
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            className="btn b-quiet"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await resendAccountCode();
                if (r.ok) setInfo(`Nouveau code envoyé à ${sentTo}.`);
                else setError(r.error);
              })
            }
          >
            Renvoyer le code
          </button>
          <button type="button" className="btn b-quiet" onClick={() => { setStep("form"); setError(null); setInfo(null); }}>
            Modifier mon adresse
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-[18px]">
      <div className="flex flex-col gap-1.5">
        {mail ? (
          <>
            <span className="label">
              <label htmlFor="acc-id">Adresse e-mail</label>
              <InfoTip align="start">Vous recevrez un code pour la valider. Elle sert ensuite à vous connecter et à recevoir vos notifications. Personne d&apos;autre ne la voit.</InfoTip>
            </span>
            <input className="input" id="acc-id" type="email" inputMode="email" autoComplete="email" value={id} onChange={(e) => setId(e.target.value)} required autoFocus={autoFocus} />
          </>
        ) : (
          <>
            <label className="label" htmlFor="acc-id">E-mail ou pseudo</label>
            <input className="input" id="acc-id" autoComplete="username" value={id} onChange={(e) => setId(e.target.value)} required autoFocus={autoFocus} />
          </>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="acc-pw">Mot de passe <span className="opt">(8 caractères minimum)</span></label>
        <input className="input" id="acc-pw" type="password" autoComplete="new-password" minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="acc-pw2">Confirmez-le</label>
        <input className="input" id="acc-pw2" type="password" autoComplete="new-password" minLength={8} value={pw2} onChange={(e) => setPw2(e.target.value)} required />
      </div>
      {error && <Alert text={error} />}
      {exists && (
        <button type="button" className="btn b-soft w-full" disabled={pending} onClick={() => start(() => switchToLogin(id.trim(), next))}>
          Me connecter à ce compte
        </button>
      )}
      <button className="btn b-primary w-full" disabled={pending} style={{ minHeight: 48, fontSize: 15 }}>
        {pending ? (mail ? "Envoi du code…" : "Création…") : mail ? "Recevoir mon code" : "Créer mon compte"}
      </button>
    </form>
  );
}

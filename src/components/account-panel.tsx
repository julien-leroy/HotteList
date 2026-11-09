"use client";

import { useState } from "react";
import { changePassword, confirmEmail, removeEmail, requestEmailVerification, updateMyName } from "@/app/actions/email";
import { CodeInput } from "./code-flow";
import { useAction } from "./toaster";

type Props = {
  firstName: string;
  lastName: string | null;
  login: string | null;
  email: string | null;
  pendingEmail: string | null;
  mail: boolean;
};

export function AccountPanel(p: Props) {
  const section = "flex min-w-0 flex-[1_1_300px] flex-col gap-3.5";
  return (
    <section id="compte" className="panel flex flex-col gap-6 p-6" style={{ scrollMarginTop: 16 }}>
      <div className="flex flex-col gap-1">
        <h2 className="font-display m-0 text-[28px] font-bold">Mon compte</h2>
        {p.login && <p className="m-0 text-sm text-gris">Identifiant de connexion : <strong>{p.login}</strong></p>}
      </div>
      <div className="flex flex-wrap gap-8">
        <div className={section}>
          <NameForm firstName={p.firstName} lastName={p.lastName} />
        </div>
        {p.mail && (
          <div className={section}>
            <EmailForm {...p} />
          </div>
        )}
        <div className={section}>
          <PasswordForm />
        </div>
      </div>
    </section>
  );
}

function NameForm({ firstName, lastName }: { firstName: string; lastName: string | null }) {
  const [f, setF] = useState(firstName);
  const [l, setL] = useState(lastName ?? "");
  const { pending, run } = useAction();
  return (
    <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); run(() => updateMyName(f, l), "Nom enregistré."); }}>
      <h3 className="label m-0 text-[15px]">Mon nom</h3>
      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="acc-f">Prénom</label>
        <input className="input" id="acc-f" value={f} onChange={(e) => setF(e.target.value)} maxLength={40} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="acc-l">Nom <span className="opt">(facultatif)</span></label>
        <input className="input" id="acc-l" value={l} onChange={(e) => setL(e.target.value)} maxLength={40} />
      </div>
      <button className="btn b-go self-start" disabled={pending || (f === firstName && l === (lastName ?? ""))}>Enregistrer</button>
    </form>
  );
}

function EmailForm({ email, pendingEmail, login }: Props) {
  const [editing, setEditing] = useState(!email);
  const [value, setValue] = useState(email ?? (login && login.includes("@") ? login : ""));
  const [waiting, setWaiting] = useState<string | null>(pendingEmail);
  const [code, setCode] = useState("");
  const { pending, run } = useAction();

  return (
    <div className="flex flex-col gap-3">
      <h3 className="label m-0 text-[15px]">Mon adresse e-mail</h3>
      <p className="m-0 text-[13px] leading-normal text-gris">
        Pour récupérer votre mot de passe ou vous connecter avec un code. Elle n&apos;est visible par personne et ne sert à rien d&apos;autre.
      </p>

      {email && !editing && !waiting && (
        <>
          <p className="m-0 flex flex-wrap items-center gap-2 text-[15px]">
            <strong>{email}</strong>
            <span className="pill" style={{ background: "#DCEDE2", color: "#14492F", minHeight: 26, fontSize: 12 }}>Confirmée</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn b-soft b-sm" onClick={() => setEditing(true)}>Changer</button>
            <button
              type="button"
              className="btn b-quiet b-sm"
              disabled={pending}
              onClick={() => {
                if (confirm("Retirer cette adresse ? Vous ne pourrez plus récupérer votre mot de passe par e-mail.")) run(() => removeEmail(), "Adresse retirée.");
              }}
            >
              Retirer
            </button>
          </div>
        </>
      )}

      {(editing || !email) && !waiting && (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => requestEmailVerification(value), undefined, (r) => {
              if (r.ok) {
                setWaiting(r.message ?? value);
                setCode("");
              }
            });
          }}
        >
          <div className="flex flex-col gap-1.5">
            <label className="label" htmlFor="acc-mail">Adresse e-mail</label>
            <input className="input" id="acc-mail" type="email" autoComplete="email" value={value} onChange={(e) => setValue(e.target.value)} placeholder="vous@exemple.fr" required />
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn b-go" disabled={pending}>{pending ? "Envoi…" : "Recevoir un code de confirmation"}</button>
            {email && <button type="button" className="btn b-quiet" onClick={() => setEditing(false)}>Annuler</button>}
          </div>
        </form>
      )}

      {waiting && (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => confirmEmail(code), "Adresse confirmée !", (r) => {
              if (r.ok) {
                setWaiting(null);
                setEditing(false);
              }
            });
          }}
        >
          <p role="status" className="m-0 rounded-xl px-3.5 py-2.5 text-sm font-semibold" style={{ background: "#E8F1EB", border: "1px solid #9CC2AC", color: "#1F5539" }}>
            Code envoyé à {waiting}. Pensez à regarder dans les spams.
          </p>
          <div className="flex flex-col gap-1.5">
            <label className="label" htmlFor="acc-code">Code de confirmation</label>
            <CodeInput id="acc-code" value={code} onChange={setCode} />
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn b-go" disabled={pending}>Confirmer</button>
            <button type="button" className="btn b-quiet" disabled={pending} onClick={() => run(() => requestEmailVerification(waiting), "Nouveau code envoyé.")}>
              Renvoyer
            </button>
            <button type="button" className="btn b-quiet" onClick={() => { setWaiting(null); setEditing(true); }}>
              Changer d&apos;adresse
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function PasswordForm() {
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const { pending, run } = useAction();
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (next !== again) return run(async () => ({ ok: false as const, error: "Les deux mots de passe ne correspondent pas." }));
        run(() => changePassword(cur, next), "Mot de passe changé.", (r) => {
          if (r.ok) {
            setCur("");
            setNext("");
            setAgain("");
          }
        });
      }}
    >
      <h3 className="label m-0 text-[15px]">Changer de mot de passe</h3>
      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="acc-cur">Mot de passe actuel</label>
        <input className="input" id="acc-cur" type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="acc-new">Nouveau <span className="opt">(8 caractères minimum)</span></label>
        <input className="input" id="acc-new" type="password" autoComplete="new-password" minLength={8} value={next} onChange={(e) => setNext(e.target.value)} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="acc-again">Confirmez-le</label>
        <input className="input" id="acc-again" type="password" autoComplete="new-password" minLength={8} value={again} onChange={(e) => setAgain(e.target.value)} required />
      </div>
      <button className="btn b-go self-start" disabled={pending}>Changer le mot de passe</button>
    </form>
  );
}

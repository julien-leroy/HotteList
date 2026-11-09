"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { loginWithCode, requestPublicCode, resetWithCode } from "@/app/actions/email";

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

/** Champ de code à 6 chiffres, compatible avec le remplissage automatique des téléphones. */
export function CodeInput({ value, onChange, id = "code" }: { value: string; onChange: (v: string) => void; id?: string }) {
  return (
    <input
      className="input text-center"
      id={id}
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9 ]*"
      maxLength={7}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/[^\d ]/g, ""))}
      placeholder="123 456"
      style={{ fontSize: 26, letterSpacing: 6, fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace", fontWeight: 700 }}
      required
    />
  );
}

/** Connexion par code (LOGIN) ou mot de passe oublié (RESET), en deux étapes. */
export function CodeFlow({ mode, next }: { mode: "LOGIN" | "RESET"; next?: string }) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function send(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    start(async () => {
      const r = await requestPublicCode(mode, email);
      if (!r.ok) return setError(r.error);
      setStep("code");
      setCode("");
      setInfo(`Si un compte confirmé correspond à ${email.trim()}, un code vient d'y être envoyé. Pensez à regarder dans les spams.`);
    });
  }

  function confirm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (mode === "RESET" && pw !== pw2) return setError("Les deux mots de passe ne correspondent pas.");
    start(async () => {
      const r = mode === "LOGIN" ? await loginWithCode(email, code, next) : await resetWithCode(email, code, pw);
      if (r && !r.ok) setError(r.error);
    });
  }

  if (step === "email") {
    return (
      <form onSubmit={send} className="flex flex-col gap-[18px]">
        <div className="flex flex-col gap-1.5">
          <label className="label" htmlFor="cf-email">Votre adresse e-mail</label>
          <input className="input" id="cf-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.fr" required autoFocus />
          <span className="text-xs text-gris-clair">Celle que vous avez confirmée dans « Mon profil ».</span>
        </div>
        {error && <Alert text={error} />}
        <button className="btn b-red w-full" disabled={pending} style={{ minHeight: 48, fontSize: 15 }}>
          {pending ? "Envoi…" : "Recevoir un code"}
        </button>
        <p className="m-0 text-center text-sm text-gris">
          <Link href={next ? `/?next=${encodeURIComponent(next)}` : "/"}>Retour à la connexion</Link>
        </p>
      </form>
    );
  }

  return (
    <form onSubmit={confirm} className="flex flex-col gap-[18px]">
      {info && <Alert text={info} tone="info" />}
      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="code">Code reçu par e-mail</label>
        <CodeInput value={code} onChange={setCode} />
      </div>
      {mode === "RESET" && (
        <>
          <div className="flex flex-col gap-1.5">
            <label className="label" htmlFor="cf-pw">Nouveau mot de passe <span className="opt">(8 caractères minimum)</span></label>
            <input className="input" id="cf-pw" type="password" autoComplete="new-password" minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="label" htmlFor="cf-pw2">Confirmez-le</label>
            <input className="input" id="cf-pw2" type="password" autoComplete="new-password" minLength={8} value={pw2} onChange={(e) => setPw2(e.target.value)} required />
          </div>
        </>
      )}
      {error && <Alert text={error} />}
      <button className="btn b-red w-full" disabled={pending} style={{ minHeight: 48, fontSize: 15 }}>
        {pending ? "Vérification…" : mode === "LOGIN" ? "Me connecter" : "Enregistrer et me connecter"}
      </button>
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" className="btn b-quiet" disabled={pending} onClick={() => send()}>Renvoyer un code</button>
        <button type="button" className="btn b-quiet" disabled={pending} onClick={() => { setStep("email"); setError(null); }}>Changer d&apos;adresse</button>
      </div>
    </form>
  );
}

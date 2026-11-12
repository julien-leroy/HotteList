"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { confirmSignup, login, resendSignupCode, signup, resetPasswordWithToken, type FormState } from "@/app/actions/auth";
import { CodeInput } from "./code-flow";

function ErrorLine({ state }: { state: FormState }) {
  if (!state?.error) return null;
  return (
    <p role="alert" className="m-0 rounded-xl border border-[#E7B9BC] bg-[#F8E6E6] px-3.5 py-2.5 text-sm font-semibold text-[#8A2730]">
      {state.error}
    </p>
  );
}

/** Ajoute ?email=… (et ?next=…) à un lien, pour ne pas faire retaper l'adresse. */
function withParams(href: string, params: Record<string, string | undefined>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
  const qs = q.toString();
  return qs ? `${href}?${qs}` : href;
}

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

export function LoginForm({
  next,
  mail = false,
  initialLogin = "",
}: {
  next?: string;
  mail?: boolean;
  initialLogin?: string;
}) {
  const [state, action, pending] = useActionState(login, undefined);
  const [id, setId] = useState(initialLogin);
  const email = isEmail(id) ? id.trim() : undefined;
  return (
    <form action={action} className="flex flex-col gap-[18px]">
      {next && <input type="hidden" name="next" value={next} />}
      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="login">{mail ? "Adresse e-mail" : "E-mail ou pseudo"}</label>
        <input className="input" id="login" name="login" autoComplete="username" inputMode="email" value={id} onChange={(e) => setId(e.target.value)} placeholder={mail ? "vous@exemple.fr" : undefined} required />
        {mail && <span className="text-xs text-gris-clair">Compte créé avant les e-mails ? Votre ancien identifiant fonctionne toujours.</span>}
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="password">Mot de passe</label>
        <input className="input" id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <ErrorLine state={state} />
      <button className="btn b-primary w-full" disabled={pending} style={{ minHeight: 48, fontSize: 15 }}>
        {pending ? "Connexion…" : "Se connecter"}
      </button>
      {mail ? (
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm">
          <Link href={withParams("/connexion-code", { next, email })}>Recevoir un code par e-mail</Link>
          <Link href={withParams("/mot-de-passe-oublie", { email })}>Mot de passe oublié ?</Link>
        </div>
      ) : (
        <p className="m-0 text-center text-[13px] leading-normal text-gris-clair">
          Mot de passe oublié ? Demandez à quelqu&apos;un de votre famille un lien de réinitialisation.
        </p>
      )}
    </form>
  );
}

export function SignupForm({
  next,
  submitLabel = "Créer mon compte",
  joinFamilyId,
  mail = false,
  initialEmail = "",
}: {
  next?: string;
  submitLabel?: string;
  joinFamilyId?: string;
  mail?: boolean;
  initialEmail?: string;
}) {
  const [state, action, pending] = useActionState(signup, undefined);
  const [f, setF] = useState({ firstName: "", lastName: "", email: initialEmail, login: "", password: "" });
  const [editing, setEditing] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  const email = isEmail(f.email) ? f.email.trim() : undefined;

  // Étape 2 : saisie du code reçu par e-mail
  if (mail && state?.step === "code" && !editing) {
    return <SignupCode email={state.email!} next={next} joinFamilyId={joinFamilyId} onEdit={() => setEditing(true)} />;
  }

  return (
    <form action={(fd) => { setEditing(false); return action(fd); }} className="flex flex-col gap-[18px]">
      {next && <input type="hidden" name="next" value={next} />}
      {joinFamilyId && <input type="hidden" name="joinFamilyId" value={joinFamilyId} />}
      <div className="flex flex-wrap gap-4">
        <div className="flex flex-[1_1_180px] flex-col gap-1.5">
          <label className="label" htmlFor="firstName">Prénom</label>
          <input className="input" id="firstName" name="firstName" placeholder="Ex. Sophie" autoComplete="given-name" value={f.firstName} onChange={set("firstName")} required />
        </div>
        <div className="flex flex-[1_1_180px] flex-col gap-1.5">
          <label className="label" htmlFor="lastName">Nom <span className="opt">(facultatif)</span></label>
          <input className="input" id="lastName" name="lastName" autoComplete="family-name" value={f.lastName} onChange={set("lastName")} />
        </div>
      </div>
      {mail ? (
        <div className="flex flex-col gap-1.5">
          <label className="label" htmlFor="email">Adresse e-mail</label>
          <input className="input" id="email" name="email" type="email" inputMode="email" placeholder="vous@exemple.fr" autoComplete="email" value={f.email} onChange={set("email")} required />
          <span className="text-xs text-gris-clair">Vous recevrez un code pour la valider. Elle sert ensuite à vous connecter.</span>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <label className="label" htmlFor="login">E-mail ou pseudo</label>
          <input className="input" id="login" name="login" placeholder="vous@exemple.fr ou sophie42" autoComplete="username" value={f.login} onChange={set("login")} required />
          <span className="text-xs text-gris-clair">Sert seulement à vous connecter.</span>
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="password">Mot de passe <span className="opt">(8 caractères minimum)</span></label>
        <input className="input" id="password" name="password" type="password" autoComplete="new-password" minLength={8} value={f.password} onChange={set("password")} required />
      </div>
      <ErrorLine state={state} />
      {state?.exists && (
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm">
          <Link href={withParams("/", { next, email: state.email })}>Se connecter</Link>
          <Link href={withParams("/mot-de-passe-oublie", { email: state.email })}>Mot de passe oublié ?</Link>
        </div>
      )}
      <button className="btn b-primary mt-1 w-full" disabled={pending} style={{ minHeight: 48, fontSize: 15 }}>
        {pending ? (mail ? "Envoi du code…" : "Création…") : mail ? "Recevoir mon code" : submitLabel}
      </button>
      <p className="m-0 text-center text-sm text-gris">
        Déjà un compte ? <Link href={withParams("/", { next, email })}>Se connecter</Link>
      </p>
    </form>
  );
}

/** Inscription, étape 2 : le code reçu par e-mail active le compte. */
function SignupCode({ email, next, joinFamilyId, onEdit }: { email: string; next?: string; joinFamilyId?: string; onEdit: () => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState(`Code envoyé à ${email}. Pensez à regarder dans les spams.`);
  const [pending, start] = useTransition();
  return (
    <form
      className="flex flex-col gap-[18px]"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r = await confirmSignup(email, code, next, joinFamilyId);
          if (r && !r.ok) setError(r.error);
        });
      }}
    >
      <div className="flex flex-col gap-1">
        <h2 className="font-display m-0 text-[24px] font-bold">Validez votre adresse</h2>
        <p role="status" className="m-0 rounded-xl px-3.5 py-2.5 text-sm font-semibold" style={{ background: "#E8F1EB", border: "1px solid #9CC2AC", color: "#1F5539" }}>
          {info}
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="code">Code à 6 chiffres</label>
        <CodeInput value={code} onChange={setCode} />
      </div>
      {error && (
        <p role="alert" className="m-0 rounded-xl border border-[#E7B9BC] bg-[#F8E6E6] px-3.5 py-2.5 text-sm font-semibold text-[#8A2730]">{error}</p>
      )}
      <button className="btn b-primary w-full" disabled={pending} style={{ minHeight: 48, fontSize: 15 }}>
        {pending ? "Vérification…" : "Valider et entrer"}
      </button>
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          className="btn b-quiet"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await resendSignupCode(email);
              if (r.ok) setInfo(`Nouveau code envoyé à ${email}.`);
              else setError(r.error);
            })
          }
        >
          Renvoyer le code
        </button>
        <button type="button" className="btn b-quiet" onClick={onEdit}>Modifier mon adresse</button>
      </div>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordWithToken, undefined);
  return (
    <form action={action} className="flex flex-col gap-[18px]">
      <input type="hidden" name="token" value={token} />
      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="password">Nouveau mot de passe</label>
        <input className="input" id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="confirm">Confirmez-le</label>
        <input className="input" id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <ErrorLine state={state} />
      <button className="btn b-primary w-full" disabled={pending} style={{ minHeight: 48 }}>
        {pending ? "Enregistrement…" : "Enregistrer et me connecter"}
      </button>
    </form>
  );
}

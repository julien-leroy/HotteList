"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, signup, resetPasswordWithToken, type FormState } from "@/app/actions/auth";

function ErrorLine({ state }: { state: FormState }) {
  if (!state?.error) return null;
  return (
    <p role="alert" className="m-0 rounded-xl border border-[#E7B9BC] bg-[#F8E6E6] px-3.5 py-2.5 text-sm font-semibold text-[#8A2730]">
      {state.error}
    </p>
  );
}

export function LoginForm({ next, signupHref = "/inscription" }: { next?: string; signupHref?: string }) {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="flex flex-col gap-[18px]">
      {next && <input type="hidden" name="next" value={next} />}
      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="login">E-mail ou pseudo</label>
        <input className="input" id="login" name="login" autoComplete="username" defaultValue={state?.values?.login} key={state?.values?.login} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="password">Mot de passe</label>
        <input className="input" id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <ErrorLine state={state} />
      <button className="btn b-red w-full" disabled={pending} style={{ minHeight: 48, fontSize: 15 }}>
        {pending ? "Connexion…" : "Se connecter"}
      </button>
      <p className="m-0 text-center text-sm text-gris">
        Pas encore de compte ? <Link href={signupHref}>Créer un compte</Link>
      </p>
      <p className="m-0 text-center text-[13px] leading-normal text-gris-clair">
        Mot de passe oublié ? Demandez à l&apos;admin de votre famille un lien de réinitialisation.
      </p>
    </form>
  );
}

export function SignupForm({
  next,
  submitLabel = "Créer mon compte",
  loginHref = "/",
  joinFamilyId,
}: {
  next?: string;
  submitLabel?: string;
  loginHref?: string;
  joinFamilyId?: string;
}) {
  const [state, action, pending] = useActionState(signup, undefined);
  return (
    <form action={action} className="flex flex-col gap-[18px]">
      {next && <input type="hidden" name="next" value={next} />}
      {joinFamilyId && <input type="hidden" name="joinFamilyId" value={joinFamilyId} />}
      <div className="flex flex-wrap gap-4">
        <div className="flex flex-[1_1_180px] flex-col gap-1.5">
          <label className="label" htmlFor="firstName">Prénom</label>
          <input className="input" id="firstName" name="firstName" placeholder="Ex. Sophie" autoComplete="given-name" defaultValue={state?.values?.firstName} key={`f${state?.values?.firstName}`} required />
        </div>
        <div className="flex flex-[1_1_180px] flex-col gap-1.5">
          <label className="label" htmlFor="lastName">Nom <span className="opt">(facultatif)</span></label>
          <input className="input" id="lastName" name="lastName" autoComplete="family-name" defaultValue={state?.values?.lastName} key={`l${state?.values?.lastName}`} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="login">E-mail ou pseudo</label>
        <input className="input" id="login" name="login" placeholder="vous@exemple.fr ou sophie42" autoComplete="username" defaultValue={state?.values?.login} key={`u${state?.values?.login}`} required />
        <span className="text-xs text-gris-clair">Sert seulement à vous connecter. Aucun e-mail ne vous sera envoyé.</span>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="password">Mot de passe <span className="opt">(8 caractères minimum)</span></label>
        <input className="input" id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <ErrorLine state={state} />
      <button className="btn b-red mt-1 w-full" disabled={pending} style={{ minHeight: 48, fontSize: 15 }}>
        {pending ? "Création…" : submitLabel}
      </button>
      <p className="m-0 text-center text-sm text-gris">
        Déjà un compte ? <Link href={loginHref}>Se connecter</Link>
      </p>
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
      <button className="btn b-red w-full" disabled={pending} style={{ minHeight: 48 }}>
        {pending ? "Enregistrement…" : "Enregistrer et me connecter"}
      </button>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { createFamily } from "@/app/actions/family";

export function CreateFamilyForm({ first }: { first: boolean }) {
  const [state, action, pending] = useActionState(createFamily, undefined);
  return (
    <form
      action={action}
      className="flex flex-col justify-center gap-4 rounded-[18px] p-6"
      style={{ border: "2px dashed #D9A93E", background: "repeating-linear-gradient(45deg,#FFF9EE 0 14px,#FBF1DC 14px 28px)", minHeight: 230 }}
    >
      <div className="flex flex-col gap-1">
        <h2 className="font-display m-0 text-2xl font-bold text-[#8A1C26]">{first ? "Créez votre première famille" : "Nouvelle famille"}</h2>
        <p className="m-0 text-sm text-gris">Vous en serez l&apos;admin, et vous recevrez un lien à partager.</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="fam-name">Nom de la famille</label>
        <input className="input" id="fam-name" name="name" placeholder="Ex. Famille Leroy" required minLength={2} maxLength={60} />
      </div>
      {state?.error && <p role="alert" className="m-0 text-sm font-semibold text-[#8A2730]">{state.error}</p>}
      <button className="btn b-red self-start" disabled={pending}>{pending ? "Création…" : "Créer la famille"}</button>
    </form>
  );
}

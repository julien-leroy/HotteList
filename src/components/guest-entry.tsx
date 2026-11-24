"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { claimMember, joinAsGuest } from "@/app/actions/guest";
import { Avatar, type AvatarPerson } from "./avatar";
import { InfoTip } from "./info-tip";

export type Claimable = AvatarPerson & { id: string };

function ErrorLine({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <p role="alert" className="m-0 rounded-xl border border-[#E7B9BC] bg-[#F8E6E6] px-3.5 py-2.5 text-sm font-semibold text-[#8A2730]">
      {text}
    </p>
  );
}

/**
 * Arrivée par le lien d'une famille, sans être connecté (nouvel appareil, cookies effacés…) : on touche son nom
 * parmi les membres sans compte HotteList, on donne son prénom, ou on se connecte avec son e-mail et son mot de passe.
 * Pas de mot de passe pour les comptes sans compte HotteList : seuls les membres de la famille ont le lien.
 */
export function GuestEntry({ familyId, familyName, slug, claimable }: { familyId: string; familyName: string; slug: string; claimable: Claimable[] }) {
  const [picked, setPicked] = useState<Claimable | null>(null);
  const [firstName, setFirstName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const next = `/f/${slug}`;

  function claim(e: React.FormEvent) {
    e.preventDefault();
    if (!picked) return;
    setError(null);
    start(async () => {
      const r = await claimMember(familyId, picked.id);
      if (r && !r.ok) setError(r.error);
    });
  }

  function join(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await joinAsGuest(familyId, firstName, "");
      if (r && !r.ok) setError(r.error);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {claimable.length > 0 && (
        <form onSubmit={claim} className="flex flex-col gap-3">
          <span className="label">Vous êtes déjà dans la famille ? Touchez votre nom</span>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Membres de la famille">
            {claimable.map((p) => {
              const on = picked?.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    setPicked(on ? null : p);
                    setError(null);
                  }}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-full py-1 pr-3.5 pl-1 text-[15px] font-semibold"
                  style={{
                    border: on ? "2px solid #CF2B35" : "1px solid #E3D6BA",
                    background: on ? "#FBE9E6" : "#FFFDF7",
                    color: "#1F3A2C",
                    margin: on ? 0 : 1,
                  }}
                >
                  <Avatar person={p} size={30} />
                  {p.firstName}
                </button>
              );
            })}
          </div>
          {picked && (
            <div className="flex flex-col gap-3">
              <ErrorLine text={error} />
              <button className="btn b-primary w-full" disabled={pending} style={{ minHeight: 48, fontSize: 15 }}>
                {pending ? "Un instant…" : `C'est moi, ${picked.firstName}`}
              </button>
            </div>
          )}
        </form>
      )}

      {claimable.length > 0 && (
        <div className="flex items-center gap-3 text-sm text-gris-clair" aria-hidden>
          <span className="h-px flex-1 bg-sable" /> ou <span className="h-px flex-1 bg-sable" />
        </div>
      )}

      <form onSubmit={join} className="flex flex-col gap-[18px]">
        <div className="flex flex-col gap-1.5">
          <label className="label flex items-center gap-1" htmlFor="g-name">
            {claimable.length > 0 ? "Je suis nouveau : ton nom" : "Ton nom"}
            <InfoTip align="start">Pas besoin d&apos;e-mail ni de mot de passe. Tu pourras créer ton compte plus tard, depuis ton profil.</InfoTip>
          </label>
          <input className="input" id="g-name" autoComplete="name" value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={40} required />
        </div>
        {!picked && <ErrorLine text={error} />}
        <button className="btn b-primary w-full" disabled={pending} style={{ minHeight: 48, fontSize: 15 }}>
          {pending && !picked ? "Un instant…" : `Rejoindre ${familyName}`}
        </button>
      </form>

      <p className="m-0 text-center text-sm text-gris">
        <Link href={`/?next=${encodeURIComponent(next)}`}>Se connecter à HotteList</Link>
      </p>
    </div>
  );
}

"use client";

import { useState } from "react";
import { cancelSecretSanta, drawSecretSanta } from "@/app/actions/santa";
import { Avatar, type AvatarPerson } from "./avatar";
import { IconGift } from "./icons";
import { confirmDialog, useAction } from "./toaster";

type P = AvatarPerson & { id: string };

/** Bandeau du tirage au sort : chacun ne voit que la personne qu'il a tirée. */
export function SantaBanner({ receiver, budget, sinceLabel }: { receiver: P; budget: string | null; sinceLabel: string }) {
  return (
    <div className="mx-auto max-w-[1200px] px-6 pt-6">
      <div
        className="flex flex-wrap items-center justify-between gap-4 rounded-[22px] px-6 py-5"
        style={{ background: "linear-gradient(135deg,#FFF4E0,#F8EDD2)", border: "2px dashed #D9A93E" }}
      >
        <div className="flex min-w-0 flex-[1_1_320px] items-center gap-4">
          <span className="flex h-14 w-14 flex-none items-center justify-center rounded-full" style={{ background: "#7E1621" }}>
            <IconGift size={30} stroke="#F2C75C" />
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] font-bold tracking-wide text-[#8A6516] uppercase">Tirage au sort · {sinceLabel}</span>
            <span className="font-display text-[26px] leading-tight font-bold">
              Vous offrez un cadeau à <span className="text-rouge">{receiver.firstName}</span>
            </span>
            <span className="text-sm text-gris">
              C&apos;est secret : personne d&apos;autre ne le sait.{budget ? ` Budget conseillé : ${budget}.` : ""}
            </span>
          </div>
        </div>
        <a className="btn b-red" href={`#p-${receiver.id}`}>
          <Avatar person={receiver} size={26} /> Voir sa liste
        </a>
      </div>
    </div>
  );
}

/** Réglages admin du tirage au sort (dans la popup Réglages). */
export function SantaSettings({
  familyId,
  candidates,
  current,
}: {
  familyId: string;
  candidates: P[];
  current: { participantIds: string[]; budget: string | null } | null;
}) {
  const [picked, setPicked] = useState<string[]>(current?.participantIds ?? candidates.map((c) => c.id));
  const [budget, setBudget] = useState(current?.budget ?? "");
  const { pending, run } = useAction();
  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-display m-0 text-[22px] font-bold">Tirage au sort</h3>
      <p className="m-0 text-[13px] leading-normal text-gris">
        Chaque participant tire au hasard une personne à qui offrir un cadeau. Chacun ne voit que son propre tirage, admin compris.
      </p>
      {current && (
        <p className="m-0 rounded-xl px-3.5 py-2.5 text-sm font-semibold" style={{ background: "#E8F1EB", border: "1px solid #9CC2AC", color: "#1F5539" }}>
          Tirage en cours avec {current.participantIds.length} participants.
        </p>
      )}
      <div className="flex flex-wrap gap-x-5">
        {candidates.map((c) => (
          <label key={c.id} className="chk">
            <input type="checkbox" checked={picked.includes(c.id)} onChange={(e) => setPicked((p) => (e.target.checked ? [...p, c.id] : p.filter((x) => x !== c.id)))} />
            {c.firstName}
          </label>
        ))}
      </div>
      <div className="flex max-w-[260px] flex-col gap-1.5">
        <label className="label" htmlFor="santa-budget">Budget conseillé <span className="opt">(facultatif)</span></label>
        <input className="input" id="santa-budget" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Ex. 30 €" maxLength={40} />
      </div>
      <div className="flex flex-wrap gap-2.5">
        <button
          type="button"
          className="btn b-gold"
          disabled={pending}
          onClick={async () => {
            if (current && !(await confirmDialog({ title: "Refaire le tirage ?", message: "Le tirage actuel sera remplacé : chacun découvrira une nouvelle personne.", confirmLabel: "Refaire le tirage", danger: true }))) return;
            run(() => drawSecretSanta(familyId, picked, budget), "Tirage fait ! Chacun a reçu une notification.");
          }}
        >
          {current ? "Refaire le tirage" : "Lancer le tirage"}
        </button>
        {current && (
          <button
            type="button"
            className="btn b-quiet"
            disabled={pending}
            onClick={async () => {
              if (await confirmDialog({ title: "Annuler le tirage ?", confirmLabel: "Annuler le tirage", danger: true })) run(() => cancelSecretSanta(familyId), "Tirage annulé.");
            }}
          >
            Annuler le tirage
          </button>
        )}
      </div>
    </div>
  );
}

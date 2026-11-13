"use client";

import { useState } from "react";
import { cancelSecretSanta, drawSecretSanta, setSantaMode } from "@/app/actions/santa";
import { listTitleProps } from "@/lib/script-metrics";
import { Avatar, type AvatarPerson } from "./avatar";
import { IconGift } from "./icons";
import { confirmDialog, useAction } from "./toaster";

type P = AvatarPerson & { id: string };

/** Encart Secret Santa, sur le côté de la page famille (en haut sur téléphone). */
export function SantaAside({
  familyId,
  isAdmin,
  candidates,
  receiver,
  receiverWishes,
  budget,
  drawnOn,
}: {
  familyId: string;
  isAdmin: boolean;
  /** Membres qui peuvent participer (ceux qui ont leur propre compte). */
  candidates: P[];
  /** La personne que j'ai tirée, ou null. */
  receiver: P | null;
  receiverWishes: number;
  budget: string | null;
  /** Date du tirage (« 12 novembre »), ou null s'il n'a pas encore eu lieu. */
  drawnOn: string | null;
}) {
  const { pending, run } = useAction();
  const ids = candidates.map((c) => c.id);
  const draw = async (again: boolean) => {
    if (again && !(await confirmDialog({ title: "Refaire le tirage ?", message: "Le tirage actuel sera remplacé : chacun découvrira une nouvelle personne.", confirmLabel: "Refaire le tirage", danger: true }))) return;
    run(() => drawSecretSanta(familyId, ids, budget ?? ""), "Tirage fait ! Chacun a reçu une notification.");
  };

  return (
    <div className="santa-card">
      <div className="santa-head">
        <span className="santa-ico"><IconGift size={20} stroke="#FFCB2E" /></span>
        <span className="santa-kicker">Secret Santa{drawnOn ? ` · tiré le ${drawnOn}` : ""}</span>
      </div>

      {receiver ? (
        <>
          <p className="m-0 text-[15px] text-gris">Vous offrez un cadeau à</p>
          <div className="flex items-center gap-3">
            <Avatar person={receiver} size={46} style={{ border: "3px solid #FFFDF7", boxShadow: "0 0 0 2px #D9A93E" }} />
            <span {...listTitleProps(receiver.firstName, 40, 200)}>{receiver.firstName}</span>
          </div>
          <p className="m-0 text-[13px] leading-normal text-gris">
            C&apos;est secret : personne d&apos;autre ne le sait.
            {budget ? <> Budget conseillé : <strong className="text-encre">{budget}</strong>.</> : null}
          </p>
          <a className="btn b-primary" href={`#p-${receiver.id}`}>
            {receiverWishes > 0 ? `Voir ses ${receiverWishes > 1 ? `${receiverWishes} souhaits` : "souhait"}` : "Voir sa liste"}
          </a>
        </>
      ) : drawnOn ? (
        <>
          <p className="m-0 text-[15px] leading-normal">Le tirage a été fait avant votre arrivée, vous n&apos;en faites pas partie.</p>
          {isAdmin ? (
            <button type="button" className="btn b-primary" disabled={pending || ids.length < 3} onClick={() => draw(true)}>
              Refaire le tirage avec tout le monde
            </button>
          ) : (
            <p className="m-0 text-[13px] text-gris">Demandez à un admin de refaire le tirage.</p>
          )}
        </>
      ) : (
        <>
          <p className="m-0 text-[15px] leading-normal">
            Chacun va tirer au sort une personne à qui offrir un cadeau. Vous ne connaîtrez que la vôtre.
          </p>
          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-semibold text-gris">
              {candidates.length} participant{candidates.length > 1 ? "s" : ""} pour l&apos;instant
            </span>
            <div className="flex flex-wrap">
              {candidates.map((c, k) => (
                <Avatar key={c.id} person={c} size={32} style={{ marginLeft: k ? -6 : 0, border: "2px solid #FFFDF7" }} />
              ))}
            </div>
          </div>
          {isAdmin ? (
            ids.length >= 3 ? (
              <>
                <button type="button" className="btn b-primary" disabled={pending} onClick={() => draw(false)}>
                  Lancer le tirage
                </button>
                <p className="m-0 text-[12px] leading-normal text-gris">Attendez que tout le monde ait rejoint la famille : ceux qui arrivent après ne seront pas dans le tirage.</p>
              </>
            ) : (
              <p className="m-0 text-[13px] leading-normal text-gris">Il faut au moins 3 personnes avec leur compte. Envoyez le lien de la famille pour les inviter.</p>
            )
          ) : (
            <p className="m-0 text-[13px] leading-normal text-gris">L&apos;admin lancera le tirage quand tout le monde aura rejoint.</p>
          )}
        </>
      )}
    </div>
  );
}

/** Réglages admin du Secret Santa (dans la popup Réglages). */
export function SantaSettings({
  familyId,
  mode,
  candidates,
  current,
}: {
  familyId: string;
  mode: boolean;
  candidates: P[];
  current: { participantIds: string[]; budget: string | null } | null;
}) {
  const [picked, setPicked] = useState<string[]>(current?.participantIds ?? candidates.map((c) => c.id));
  const [budget, setBudget] = useState(current?.budget ?? "");
  const { pending, run } = useAction();
  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-display m-0 text-[22px] font-bold">Secret Santa</h3>
      <p className="m-0 text-[13px] leading-normal text-gris">
        Chaque participant tire au hasard une personne à qui offrir un cadeau. Chacun ne voit que son propre tirage, admin compris.
      </p>
      <label className="chk">
        <input
          type="checkbox"
          checked={mode}
          disabled={pending}
          onChange={async (e) => {
            const on = e.target.checked;
            if (!on && current && !(await confirmDialog({ title: "Couper le Secret Santa ?", message: "Le tirage en cours sera annulé.", confirmLabel: "Couper", danger: true }))) return;
            run(() => setSantaMode(familyId, on), on ? "Secret Santa activé." : "Secret Santa coupé.");
          }}
        />
        Activer le Secret Santa dans cette famille
      </label>
      {mode && (
        <>
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
        </>
      )}
    </div>
  );
}

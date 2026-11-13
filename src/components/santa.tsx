"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { drawSecretSanta, revealSecretSanta, setSantaBudget, setSantaMode, type SantaReveal } from "@/app/actions/santa";
import { listTitleProps } from "@/lib/script-metrics";
import { Avatar, type AvatarPerson } from "./avatar";
import { IconGift } from "./icons";
import { confirmDialog, toast, useAction } from "./toaster";

type P = AvatarPerson & { id: string };

/** Où en est le Secret Santa pour moi. */
export type SantaState =
  | { kind: "none" } // pas encore de tirage
  | { kind: "outside" } // tirage fait avant mon arrivée
  | { kind: "toDiscover" } // tirage fait, je n'ai pas encore cliqué sur « Découvrir »
  | { kind: "revealed"; receiver: P; wishes: number };

/** Encart Secret Santa, sur le côté de la page famille (en haut sur téléphone). */
export function SantaAside({
  familyId,
  isAdmin,
  memberCount,
  pool,
  state,
  budget,
  drawnOn,
}: {
  familyId: string;
  isAdmin: boolean;
  /** Nombre de membres qui ont leur compte (ceux qui participent au tirage). */
  memberCount: number;
  /** Les autres participants, pour l'animation du tirage. */
  pool: P[];
  state: SantaState;
  budget: string | null;
  /** Date du tirage (« 12 novembre »), ou null. */
  drawnOn: string | null;
}) {
  const { pending, run } = useAction();
  const [revealing, setRevealing] = useState(false);
  const launch = () => run(() => drawSecretSanta(familyId), undefined, (r) => r.ok && r.message && toast(r.message));

  return (
    <div className="santa-card">
      <div className="santa-head">
        <span className="santa-ico"><IconGift size={20} stroke="#FFCB2E" /></span>
        <span className="santa-kicker">Secret Santa{drawnOn ? ` · tiré le ${drawnOn}` : ""}</span>
      </div>

      {state.kind === "revealed" && (
        <>
          <p className="m-0 text-[15px] text-gris">Vous offrez un cadeau à</p>
          <div className="flex items-center gap-3">
            <Avatar person={state.receiver} size={46} style={{ border: "3px solid #FFFDF7", boxShadow: "0 0 0 2px #D9A93E" }} />
            <span {...listTitleProps(state.receiver.firstName, 40, 200)}>{state.receiver.firstName}</span>
          </div>
          <p className="m-0 text-[13px] leading-normal text-gris">
            C&apos;est secret : personne d&apos;autre ne le sait.
            {budget ? <> Budget conseillé : <strong className="text-encre">{budget}</strong>.</> : null}
          </p>
          <a className="btn b-primary" href={`#p-${state.receiver.id}`}>
            {state.wishes > 0 ? `Voir ${state.wishes > 1 ? `ses ${state.wishes} souhaits` : "son souhait"}` : "Voir sa liste"}
          </a>
          <button type="button" className="santa-replay" onClick={() => setRevealing(true)}>
            Revoir le tirage
          </button>
        </>
      )}

      {state.kind === "toDiscover" && (
        <>
          <div className="santa-teaser" aria-hidden="true">
            <IconGift size={54} stroke="#7E1621" strokeWidth={1.8} />
          </div>
          <p className="m-0 text-center text-[16px] leading-normal">
            Le tirage est fait !<br />
            <strong>À qui allez-vous offrir un cadeau ?</strong>
          </p>
          <button type="button" className="btn b-primary" onClick={() => setRevealing(true)}>
            Découvrir
          </button>
        </>
      )}

      {state.kind === "outside" && (
        <>
          <p className="m-0 text-[15px] leading-normal">Le tirage a été fait avant votre arrivée, vous n&apos;en faites pas partie.</p>
          {isAdmin ? (
            <button
              type="button"
              className="btn b-primary"
              disabled={pending}
              onClick={async () => {
                if (await confirmDialog({ title: "Relancer le tirage ?", message: "Un nouveau tirage remplace l'actuel, avec tous les membres : chacun devra recliquer sur « Découvrir ».", confirmLabel: "Relancer le tirage" })) launch();
              }}
            >
              Relancer avec tout le monde
            </button>
          ) : (
            <p className="m-0 text-[13px] text-gris">Un admin peut relancer le tirage pour vous inclure.</p>
          )}
        </>
      )}

      {state.kind === "none" && (
        <>
          <p className="m-0 text-[15px] leading-normal">Chacun va tirer au sort une personne de la famille à qui offrir un cadeau. Vous ne connaîtrez que la vôtre.</p>
          {memberCount >= 3 ? (
            isAdmin ? (
              <button type="button" className="btn b-primary" disabled={pending} onClick={launch}>
                {pending ? "Tirage…" : `Lancer le tirage (${memberCount} personnes)`}
              </button>
            ) : (
              <p className="m-0 text-[13px] text-gris">L&apos;admin va lancer le tirage.</p>
            )
          ) : (
            <p className="m-0 text-[13px] leading-normal text-gris">
              Il faut au moins 3 membres dans la famille. {isAdmin ? "Envoyez-leur le lien de la famille ; vous lancerez le tirage ensuite." : ""}
            </p>
          )}
        </>
      )}

      {revealing && <SantaReveal familyId={familyId} pool={pool} budget={budget} onClose={() => setRevealing(false)} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Animation « Découvrir » : les prénoms défilent puis s'arrêtent      */
/* ------------------------------------------------------------------ */

const CONFETTI = ["#FFCB2E", "#FF4A55", "#3F7A52", "#FFF9EE", "#FFD146"];

function SantaReveal({ familyId, pool, budget, onClose }: { familyId: string; pool: P[]; budget: string | null; onClose: () => void }) {
  const router = useRouter();
  const [shown, setShown] = useState<P | null>(pool[0] ?? null);
  const [receiver, setReceiver] = useState<P | null>(null);
  const [error, setError] = useState<string | null>(null);
  const result = useRef<SantaReveal | null>(null);

  useEffect(() => {
    let alive = true;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    void revealSecretSanta(familyId).then((r) => {
      result.current = r;
      if (!r.ok) setError(r.error);
      else if (reduce || pool.length < 2) setReceiver(r.receiver);
    });
    if (reduce || pool.length < 2) return;
    // Les prénoms défilent de plus en plus lentement, puis s'arrêtent sur la personne tirée
    let step = 0;
    let i = Math.floor(Math.random() * pool.length);
    const STEPS = 20;
    const tick = () => {
      if (!alive) return;
      const r = result.current;
      if (step >= STEPS && r) {
        if (r.ok) {
          setShown(r.receiver);
          setTimeout(() => alive && setReceiver(r.receiver), 450);
        }
        return;
      }
      i = (i + 1) % pool.length;
      setShown(pool[i]);
      step++;
      const t = Math.min(step, STEPS) / STEPS;
      setTimeout(tick, 50 + 260 * t * t);
    };
    tick();
    return () => {
      alive = false;
    };
  }, [familyId, pool]);

  function finish() {
    onClose();
    router.refresh();
    if (receiver) setTimeout(() => document.getElementById(`p-${receiver.id}`)?.scrollIntoView({ behavior: "smooth" }), 500);
  }

  return (
    <Dialog.Root open onOpenChange={(o) => !o && (receiver || error) && finish()}>
      <Dialog.Portal>
        <Dialog.Overlay className="santa-veil">
          <Dialog.Content className="santa-reveal" aria-describedby={undefined}>
            <Dialog.Title className="sr-only">Votre Secret Santa</Dialog.Title>
            {receiver && (
              <div className="santa-confetti" aria-hidden="true">
                {Array.from({ length: 36 }, (_, k) => (
                  <i
                    key={k}
                    style={{
                      left: `${(k * 37) % 100}%`,
                      background: CONFETTI[k % CONFETTI.length],
                      animationDelay: `${(k % 9) * 0.07}s`,
                      animationDuration: `${1.6 + (k % 5) * 0.25}s`,
                      transform: `rotate(${k * 41}deg)`,
                    }}
                  />
                ))}
              </div>
            )}
            <p className="santa-reveal-kicker">{receiver ? "Vous offrez un cadeau à" : error ? "Oups" : "Tirage en cours…"}</p>
            {error ? (
              <p className="m-0 text-[16px]">{error}</p>
            ) : (
              shown && (
                <div className={receiver ? "santa-slot santa-slot-done" : "santa-slot"}>
                  {receiver && <span className="santa-rays" aria-hidden="true" />}
                  <Avatar person={shown} size={receiver ? 96 : 76} style={{ border: "4px solid #FFF9EE", fontSize: receiver ? 30 : 24 }} />
                  <span className="santa-slot-name">{shown.firstName}</span>
                </div>
              )
            )}
            {receiver && (
              <>
                <p className="m-0 text-[15px] text-[#F6DCDD]">
                  Chut, c&apos;est un secret !{budget ? <> Budget conseillé : <strong className="text-ivoire">{budget}</strong>.</> : null}
                </p>
                <button type="button" className="btn b-santa" onClick={finish} autoFocus>
                  Voir sa liste
                </button>
              </>
            )}
            {error && (
              <button type="button" className="btn b-santa" onClick={finish}>
                Fermer
              </button>
            )}
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/* ------------------------------------------------------------------ */
/*  Réglages admin (dans la popup Réglages)                             */
/* ------------------------------------------------------------------ */

export function SantaSettings({
  familyId,
  mode,
  memberCount,
  current,
}: {
  familyId: string;
  mode: boolean;
  memberCount: number;
  current: { budget: string | null; total: number; revealed: number; drawnOn: string } | null;
}) {
  const { pending, run } = useAction();
  const [budget, setBudget] = useState(current?.budget ?? "");
  const withMessage = (r: { ok: boolean; message?: string }) => r.ok && r.message && toast(r.message);

  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-display m-0 text-[22px] font-bold">Secret Santa</h3>
      <p className="m-0 text-[13px] leading-normal text-gris">
        Tous les membres de la famille qui ont leur compte tirent au sort une personne à qui offrir un cadeau. Chacun la découvre en cliquant sur « Découvrir » et ne voit que la sienne, admin compris.
      </p>
      <label className="chk">
        <input
          type="checkbox"
          checked={mode}
          disabled={pending}
          onChange={async (e) => {
            const on = e.target.checked;
            if (!on && current && !(await confirmDialog({ title: "Couper le Secret Santa ?", message: "Le tirage en cours sera annulé.", confirmLabel: "Couper", danger: true }))) return;
            run(() => setSantaMode(familyId, on), undefined, withMessage);
          }}
        />
        Activer le Secret Santa dans cette famille
      </label>

      {mode && current && (
        <>
          <p className="m-0 rounded-xl px-3.5 py-2.5 text-sm font-semibold" style={{ background: "#E8F1EB", border: "1px solid #9CC2AC", color: "#1F5539" }}>
            Tiré le {current.drawnOn} entre {current.total} personnes · {current.revealed === current.total ? "tout le monde a découvert le sien" : `${current.revealed} sur ${current.total} l'ont découvert`}.
          </p>
          <div className="flex flex-wrap items-end gap-2.5">
            <div className="flex max-w-[220px] flex-col gap-1.5">
              <label className="label" htmlFor="santa-budget">Budget conseillé <span className="opt">(facultatif)</span></label>
              <input className="input" id="santa-budget" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Ex. 30 €" maxLength={40} />
            </div>
            <button className="btn b-soft" disabled={pending || budget === (current.budget ?? "")} onClick={() => run(() => setSantaBudget(familyId, budget), "Budget enregistré.")}>
              Enregistrer
            </button>
          </div>
          <button
            className="btn b-red self-start"
            disabled={pending || memberCount < 3}
            onClick={async () => {
              if (await confirmDialog({ title: "Relancer le tirage ?", message: `Un nouveau tirage remplace l'actuel, avec les ${memberCount} membres : chacun devra recliquer sur « Découvrir ».`, confirmLabel: "Relancer le tirage", danger: true }))
                run(() => drawSecretSanta(familyId, budget), undefined, withMessage);
            }}
          >
            Relancer le tirage
          </button>
        </>
      )}

      {mode && !current && (
        <>
          <div className="flex max-w-[220px] flex-col gap-1.5">
            <label className="label" htmlFor="santa-budget">Budget conseillé <span className="opt">(facultatif)</span></label>
            <input className="input" id="santa-budget" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Ex. 30 €" maxLength={40} />
          </div>
          <button className="btn b-red self-start" disabled={pending || memberCount < 3} onClick={() => run(() => drawSecretSanta(familyId, budget), undefined, withMessage)}>
            Lancer le tirage ({memberCount} personnes)
          </button>
          {memberCount < 3 && <p className="m-0 text-[13px] text-gris">Il faut au moins 3 membres avec leur compte.</p>}
        </>
      )}
    </div>
  );
}

"use client";

import { useActionState, useRef, useState } from "react";
import { createFamily } from "@/app/actions/family";
import { eventDay } from "@/lib/format";
import { IconStar } from "./icons";

type Preset = "noel" | "anniversaire" | "autre";

/** Création d'une famille : Noël le 25 décembre par défaut, modifiable en un clic. */
export function CreateFamilyForm({ first, christmas, today }: { first: boolean; christmas: string; today: string }) {
  const [state, action, pending] = useActionState(createFamily, undefined);
  const [editing, setEditing] = useState(false);
  const [preset, setPreset] = useState<Preset>("noel");
  const [eventName, setEventName] = useState("Noël");
  const [eventDate, setEventDate] = useState(christmas);
  const titleRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);

  function pick(p: Preset) {
    setPreset(p);
    if (p === "noel") {
      setEventName("Noël");
      setEventDate(christmas);
    } else if (p === "anniversaire") {
      setEventName("Anniversaire de ");
      setEventDate("");
      setTimeout(() => {
        const el = titleRef.current;
        el?.focus();
        el?.setSelectionRange(el.value.length, el.value.length);
      }, 0);
    } else {
      setEventName("");
      setEventDate("");
      setTimeout(() => titleRef.current?.focus(), 0);
    }
  }

  const chip = (p: Preset, label: string) => (
    <button key={p} type="button" aria-pressed={preset === p} onClick={() => pick(p)}>
      {label}
    </button>
  );

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

      <input type="hidden" name="eventName" value={eventName.trim()} />
      <input type="hidden" name="eventDate" value={eventDate} />

      {!editing ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-papier px-3.5 py-2.5" style={{ border: "1px solid #E3D6BA" }}>
          <span className="flex items-center gap-2 text-[15px]">
            <IconStar size={15} style={{ color: "#D9A93E" }} />
            <span>
              Pour <strong>{eventName}</strong>, le {eventDay(`${eventDate}T12:00:00Z`)}
            </span>
          </span>
          <button type="button" className="btn b-soft b-sm" onClick={() => setEditing(true)}>
            Changer
          </button>
        </div>
      ) : (
        <fieldset className="m-0 flex flex-col gap-3 rounded-xl bg-papier p-3.5" style={{ border: "1px solid #E3D6BA" }}>
          <legend className="label px-1">Pour quel événement ?</legend>
          <div className="seg self-start" role="group" aria-label="Type d'événement">
            {chip("noel", "Noël")}
            {chip("anniversaire", "Anniversaire")}
            {chip("autre", "Autre")}
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="flex flex-[2_1_180px] flex-col gap-1.5">
              <label className="label" htmlFor="fam-event">Titre</label>
              <input
                ref={titleRef}
                className="input"
                id="fam-event"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder={preset === "anniversaire" ? "Anniversaire de Léa" : "Ex. Fête des mères, Pâques…"}
                required
                minLength={2}
                maxLength={60}
              />
            </div>
            <div className="flex flex-[1_1_150px] flex-col gap-1.5">
              <label className="label" htmlFor="fam-date">Date</label>
              <input ref={dateRef} className="input" id="fam-date" type="date" min={today} value={eventDate} onChange={(e) => setEventDate(e.target.value)} required />
            </div>
          </div>
        </fieldset>
      )}

      <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-papier px-3.5 py-3" style={{ border: "1px solid #E3D6BA" }}>
        <input type="checkbox" name="santa" className="mt-0.5 flex-none" style={{ width: 20, height: 20, accentColor: "#1F4D36" }} />
        <span className="flex flex-col gap-0.5">
          <span className="text-[15px] font-semibold">Faire un Secret Santa</span>
          <span className="text-[13px] leading-snug text-gris">Chacun tire au sort une personne à qui offrir un cadeau. Vous lancerez le tirage quand tout le monde aura rejoint.</span>
        </span>
      </label>

      {state?.error && <p role="alert" className="m-0 text-sm font-semibold text-[#8A2730]">{state.error}</p>}
      <button className="btn b-red self-start" disabled={pending || (editing && (!eventDate || eventName.trim().length < 2))}>
        {pending ? "Création…" : "Créer la famille"}
      </button>
    </form>
  );
}

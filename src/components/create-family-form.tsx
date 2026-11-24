"use client";

import { useActionState, useRef, useState } from "react";
import { createFamily } from "@/app/actions/family";
import { eventDay } from "@/lib/format";
import { Cake, CalendarDays, TreePine } from "lucide-react";
import { InfoTip } from "./info-tip";

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
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="label" htmlFor="fam-name">Nom de la famille</label>
        <input className="input" id="fam-name" name="name" required minLength={2} maxLength={60} />
      </div>

      <input type="hidden" name="eventName" value={eventName.trim()} />
      <input type="hidden" name="eventDate" value={eventDate} />

      {!editing ? (
        <div className="flex flex-col gap-1.5">
          <span className="label">Date de l&apos;événement</span>
          <div className="flex items-center gap-2.5 rounded-xl bg-papier py-1.5 pr-1.5 pl-3" style={{ border: "1px solid #E3D6BA" }}>
            <EventIcon preset={preset} />
            <span className="min-w-0 flex-1 truncate text-[15px]">
              Pour <strong>{eventName}</strong>
              {preset !== "noel" && <span className="text-gris"> · {eventDay(`${eventDate}T12:00:00Z`)}</span>}
            </span>
            <button type="button" className="btn b-soft b-sm flex-none" onClick={() => setEditing(true)}>
              Modifier
            </button>
          </div>
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

      <div className="flex items-center">
        <label className="chk">
          <input type="checkbox" name="santa" />
          Activer le Secret Santa
        </label>
        <InfoTip>Chacun tire au sort une personne à qui offrir un cadeau. Le tirage se lance depuis la page de la famille.</InfoTip>
      </div>

      {state?.error && <p role="alert" className="m-0 text-sm font-semibold text-[#8A2730]">{state.error}</p>}
      <button className="btn b-red self-start" disabled={pending || (editing && (!eventDate || eventName.trim().length < 2))}>
        {pending ? "Création…" : "Créer la famille"}
      </button>
    </form>
  );
}

/** Sapin pour Noël, gâteau pour un anniversaire, calendrier pour le reste. */
function EventIcon({ preset }: { preset: Preset }) {
  const Icon = preset === "noel" ? TreePine : preset === "anniversaire" ? Cake : CalendarDays;
  const color = preset === "noel" ? "#2A6B4B" : preset === "anniversaire" ? "#CF2B35" : "#7A5410";
  return <Icon size={19} color={color} strokeWidth={1.8} aria-hidden="true" className="flex-none" />;
}

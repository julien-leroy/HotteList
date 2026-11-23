"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GiftForm } from "./gift-form";

export type ShareFamily = {
  id: string;
  slug: string;
  name: string;
  /** moi, puis les comptes que je gère dans cette famille */
  people: { id: string; label: string; existing: { title: string; url: string | null }[] }[];
};

/** Page « Partager » : la famille de la dernière visite est déjà choisie ; on change d'un toucher. */
export function SharePanel({ families, prefill }: { families: ShareFamily[]; prefill: { url: string; title: string } }) {
  const router = useRouter();
  const [familyId, setFamilyId] = useState(families[0].id);
  const family = families.find((f) => f.id === familyId) ?? families[0];
  const [personId, setPersonId] = useState(family.people[0].id);
  const person = family.people.find((p) => p.id === personId) ?? family.people[0];

  return (
    <div className="card flex flex-col gap-5 p-5 sm:p-7">
      {families.length > 1 && (
        <div className="flex flex-col gap-2">
          <span className="label">Dans quelle famille ?</span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Famille">
            {families.map((f) => (
              <button
                key={f.id}
                type="button"
                role="radio"
                aria-checked={f.id === familyId}
                className="chip-choice"
                onClick={() => {
                  setFamilyId(f.id);
                  setPersonId(f.people[0].id);
                }}
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>
      )}
      {family.people.length > 1 && (
        <div className="flex flex-col gap-2">
          <span className="label">Sur la liste de</span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Liste">
            {family.people.map((p) => (
              <button key={p.id} type="button" role="radio" aria-checked={p.id === person.id} className="chip-choice" onClick={() => setPersonId(p.id)}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <GiftForm
        mode="create"
        bare
        kind="SOUHAIT"
        familyId={family.id}
        recipientId={person.id}
        title=""
        hint=""
        existing={person.existing}
        prefill={prefill}
        onDone={() => router.push(`/f/${family.slug}`)}
      />
    </div>
  );
}

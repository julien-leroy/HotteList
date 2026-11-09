"use client";

import { useState, useTransition } from "react";
import { joinFamily } from "@/app/actions/family";
import type { AvatarPerson } from "./avatar";

export function JoinButton({ familyId, familyName, managed }: { familyId: string; familyName: string; managed: (AvatarPerson & { id: string })[] }) {
  const [picked, setPicked] = useState<string[]>(managed.map((m) => m.id));
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-[18px]">
      {managed.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="label">Ajouter aussi les comptes que vous gérez :</span>
          {managed.map((m) => (
            <label key={m.id} className="chk">
              <input
                type="checkbox"
                checked={picked.includes(m.id)}
                onChange={(e) => setPicked((p) => (e.target.checked ? [...p, m.id] : p.filter((x) => x !== m.id)))}
              />
              {m.firstName}
            </label>
          ))}
        </div>
      )}
      <button
        type="button"
        className="btn b-red w-full"
        style={{ minHeight: 48, fontSize: 15 }}
        disabled={pending}
        onClick={() => start(() => joinFamily(familyId, picked))}
      >
        {pending ? "Un instant…" : `Rejoindre ${familyName}`}
      </button>
    </div>
  );
}

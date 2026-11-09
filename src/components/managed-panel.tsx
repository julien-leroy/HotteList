"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PersonLite } from "@/lib/visibility";
import { AVATAR_COLORS } from "@/lib/colors";
import { createManaged, deleteManaged, giveAccess, updateManaged } from "@/app/actions/managed";
import { setManagedInFamily } from "@/app/actions/family";
import { Avatar } from "./avatar";
import { IconPlus } from "./icons";
import { confirmDialog, useAction } from "./toaster";

type Fam = { id: string; name: string };

export function ManagedPanel({
  me,
  managed,
  currentId,
  families,
  managedFamilies,
}: {
  me: PersonLite;
  managed: PersonLite[];
  currentId: string;
  families: Fam[];
  managedFamilies: Record<string, string[]>;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [panel, setPanel] = useState<"edit" | "access" | null>(null);
  const current = managed.find((m) => m.id === currentId) ?? null;
  const people = [{ ...me, label: "Moi" }, ...managed.map((m) => ({ ...m, label: m.firstName }))];

  return (
    <>
      <div className="flex flex-col gap-2.5">
        <span className="label" id="who-label">Listes de</span>
        <div role="group" aria-labelledby="who-label" className="flex flex-wrap gap-2.5">
          {people.map((p) => (
            <button
              key={p.id}
              className="who"
              type="button"
              aria-pressed={p.id === currentId}
              onClick={() => {
                setPanel(null);
                router.push(p.id === me.id ? "/profil" : `/profil?pour=${p.id}`);
              }}
            >
              <Avatar person={p} size={40} />
              {p.label}
            </button>
          ))}
          <button className="btn b-gold" type="button" onClick={() => setCreating((v) => !v)} style={{ minHeight: 52 }}>
            <IconPlus /> Créer un compte géré
          </button>
        </div>
      </div>

      {creating && <CreateManaged families={families} onDone={(id) => { setCreating(false); if (id) router.push(`/profil?pour=${id}`); }} />}

      {current && (
        <div className="flex flex-col gap-4 rounded-[18px] px-5 py-4" style={{ background: "#F8EDD2", border: "1px solid #E5CF96" }}>
          <div className="flex flex-wrap items-center justify-between gap-3.5">
            <p className="m-0 flex-[1_1_360px] text-[15px] leading-normal text-[#4A3810]">
              <strong>Vous gérez le compte de {current.firstName}.</strong> Vous voyez tout sur sa liste, réservations et commentaires compris. Ajoutez et rangez ses souhaits comme les vôtres.
            </p>
            <div className="flex flex-wrap gap-2">
              <button className="btn b-soft" type="button" aria-expanded={panel === "edit"} onClick={() => setPanel(panel === "edit" ? null : "edit")}>
                Modifier son profil
              </button>
              <button className="btn b-soft" type="button" aria-expanded={panel === "access"} onClick={() => setPanel(panel === "access" ? null : "access")}>
                Lui donner un accès
              </button>
            </div>
          </div>
          {panel === "edit" && <EditManaged person={current} families={families} inFamilies={managedFamilies[current.id] ?? []} onDeleted={() => router.push("/profil")} />}
          {panel === "access" && <GiveAccess person={current} onDone={() => router.push("/profil")} />}
        </div>
      )}
    </>
  );
}

function Swatches({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="label" id="sw-label">Couleur</span>
      <div role="group" aria-labelledby="sw-label" className="flex flex-wrap gap-2.5">
        {AVATAR_COLORS.map((w) => (
          <button key={w.c} className="sw" type="button" aria-label={w.name} aria-pressed={value === w.c} onClick={() => onChange(w.c)} style={{ background: w.c }} />
        ))}
      </div>
    </div>
  );
}

function CreateManaged({ families, onDone }: { families: Fam[]; onDone: (id?: string) => void }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(AVATAR_COLORS[3].c);
  const [picked, setPicked] = useState<string[]>(families.map((f) => f.id));
  const { pending, run } = useAction();
  return (
    <div className="flex flex-wrap gap-7 rounded-[22px] bg-papier p-[26px]" style={{ border: "2px solid #D9BE7E" }}>
      <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-display m-0 text-[26px] font-bold">Nouveau compte géré</h2>
          <p className="m-0 text-sm leading-normal text-gris">
            Pour un enfant ou un proche sans e-mail. Vous écrivez ses souhaits à sa place et vous voyez tout : réservations, participants, commentaires.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="label" htmlFor="np">Prénom</label>
          <input className="input" id="np" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Hugo" maxLength={40} />
        </div>
        <Swatches value={color} onChange={setColor} />
      </div>
      <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-2.5">
        <span className="label">Dans quelles familles ?</span>
        {families.length === 0 && <span className="text-sm text-gris">Rejoignez d&apos;abord une famille.</span>}
        {families.map((f) => (
          <label key={f.id} className="chk">
            <input type="checkbox" checked={picked.includes(f.id)} onChange={(e) => setPicked((p) => (e.target.checked ? [...p, f.id] : p.filter((x) => x !== f.id)))} />
            {f.name}
          </label>
        ))}
        <div className="mt-auto flex flex-wrap gap-2.5">
          <button className="btn b-go" type="button" disabled={pending} onClick={() => run(() => createManaged(name, color, picked), "Compte créé.", (r) => r.ok && onDone(r.message))}>
            Créer le compte
          </button>
          <button className="btn b-quiet" type="button" onClick={() => onDone()}>Annuler</button>
        </div>
      </div>
    </div>
  );
}

function EditManaged({ person, families, inFamilies, onDeleted }: { person: PersonLite; families: Fam[]; inFamilies: string[]; onDeleted: () => void }) {
  const [name, setName] = useState(person.firstName);
  const [color, setColor] = useState(person.avatarColor);
  const { pending, run } = useAction();
  return (
    <div className="flex flex-wrap gap-6 rounded-2xl bg-papier p-5">
      <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-3.5">
        <div className="flex flex-col gap-1.5">
          <label className="label" htmlFor="em-name">Prénom</label>
          <input className="input" id="em-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
        </div>
        <Swatches value={color} onChange={setColor} />
        <div className="flex flex-wrap gap-2.5">
          <button className="btn b-go" type="button" disabled={pending} onClick={() => run(() => updateManaged(person.id, name, color), "Profil enregistré.")}>
            Enregistrer
          </button>
          <button
            className="btn b-quiet"
            type="button"
            disabled={pending}
            onClick={() => {
              void confirmDialog({ title: `Supprimer le compte de ${person.firstName} ?`, message: "Tous ses souhaits, dans toutes les familles, seront supprimés. C'est définitif.", confirmLabel: "Supprimer le compte", danger: true }).then((ok) => ok && run(() => deleteManaged(person.id), "Compte supprimé.", (r) => r.ok && onDeleted()));
            }}
          >
            Supprimer le compte
          </button>
        </div>
      </div>
      <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-1">
        <span className="label">Ses familles</span>
        {families.map((f) => (
          <label key={f.id} className="chk">
            <input type="checkbox" defaultChecked={inFamilies.includes(f.id)} disabled={pending} onChange={(e) => run(() => setManagedInFamily(f.id, person.id, e.target.checked))} />
            {f.name}
          </label>
        ))}
      </div>
    </div>
  );
}

function GiveAccess({ person, onDone }: { person: PersonLite; onDone: () => void }) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const { pending, run } = useAction();
  return (
    <div className="flex flex-col gap-3.5 rounded-2xl bg-papier p-5">
      <p className="m-0 text-sm leading-normal text-gris">
        {person.firstName} pourra se connecter et gérer sa liste. Attention : le compte devient autonome. Vous ne le gérerez plus, et ses réservations et commentaires lui seront cachés comme pour tout le monde.
      </p>
      <div className="flex flex-wrap gap-3">
        <div className="flex flex-[1_1_200px] flex-col gap-1.5">
          <label className="label" htmlFor="ga-login">Identifiant (e-mail ou pseudo)</label>
          <input className="input" id="ga-login" value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="off" />
        </div>
        <div className="flex flex-[1_1_200px] flex-col gap-1.5">
          <label className="label" htmlFor="ga-pw">Mot de passe provisoire</label>
          <input className="input" id="ga-pw" type="text" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" minLength={8} />
        </div>
      </div>
      <button
        className="btn b-red self-start"
        type="button"
        disabled={pending}
        onClick={() => {
          void confirmDialog({ title: `Rendre le compte de ${person.firstName} autonome ?`, message: "Vous ne pourrez plus le gérer, et ses réservations et commentaires lui seront cachés comme pour tout le monde.", confirmLabel: "Créer son accès" }).then((ok) => ok && run(() => giveAccess(person.id, login, password), "Accès créé.", (r) => r.ok && onDone()));
        }}
      >
        Créer son accès
      </button>
    </div>
  );
}

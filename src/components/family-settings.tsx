"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  createResetLink,
  leaveFamily,
  regenerateLink,
  removeMember,
  renameFamily,
  setEvent,
  setManagedInFamily,
  setMemberRole,
} from "@/app/actions/family";
import { Avatar, type AvatarPerson } from "./avatar";
import { CopyLink } from "./copy-link";
import { SantaSettings } from "./santa";
import { IconClose, IconSettings } from "./icons";
import { confirmDialog, useAction } from "./toaster";

type Member = AvatarPerson & { id: string; role: "ADMIN" | "MEMBRE"; managed: boolean; nickname: string | null };

export function FamilySettings({
  family,
  isAdmin,
  meId,
  members,
  myManaged,
  santa,
  today,
}: {
  family: { id: string; name: string; eventName: string; eventDate: string };
  today: string;
  isAdmin: boolean;
  meId: string;
  members: Member[];
  myManaged: (AvatarPerson & { id: string; inFamily: boolean })[];
  santa: { candidates: (AvatarPerson & { id: string })[]; current: { participantIds: string[]; budget: string | null } | null } | null;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(family.name);
  const [date, setDate] = useState(family.eventDate);
  const [eventName, setEventName] = useState(family.eventName);
  const [resetUrl, setResetUrl] = useState<{ who: string; url: string } | null>(null);
  const { pending, run } = useAction();

  const section = "flex flex-col gap-3 border-t-2 border-dotted border-or pt-5";

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="btn b-light" style={{ minHeight: 40 }}>
          <IconSettings /> {isAdmin ? "Réglages de la famille" : "Membres"}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="veil">
          <Dialog.Content className="modal flex max-w-[640px] flex-col gap-5 p-7" aria-describedby={undefined}>
            <div className="flex items-center justify-between gap-3">
              <Dialog.Title className="font-display m-0 text-[28px] font-bold">{family.name}</Dialog.Title>
              <Dialog.Close asChild>
                <button className="btn b-soft b-icon" aria-label="Fermer" style={{ borderRadius: "50%" }}>
                  <IconClose size={18} />
                </button>
              </Dialog.Close>
            </div>

            {isAdmin && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-end gap-2.5">
                  <div className="flex flex-[1_1_240px] flex-col gap-1.5">
                    <label className="label" htmlFor="fs-name">Nom de la famille</label>
                    <input className="input" id="fs-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
                  </div>
                  <button className="btn b-soft" disabled={pending || name === family.name} onClick={() => run(() => renameFamily(family.id, name), "Nom modifié.")}>
                    Renommer
                  </button>
                </div>
                <div className="flex flex-col gap-2.5">
                  <span className="label">Événement</span>
                  <div className="flex flex-wrap items-end gap-2.5">
                    <div className="flex flex-[2_1_200px] flex-col gap-1.5">
                      <label className="label" htmlFor="fs-event">Titre</label>
                      <input className="input" id="fs-event" value={eventName} onChange={(e) => setEventName(e.target.value)} maxLength={60} placeholder="Noël, Anniversaire de Léa…" />
                    </div>
                    <div className="flex flex-[1_1_150px] flex-col gap-1.5">
                      <label className="label" htmlFor="fs-date">Date</label>
                      <input className="input" id="fs-date" type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} />
                    </div>
                    <button
                      className="btn b-soft"
                      disabled={pending || (date === family.eventDate && eventName === family.eventName)}
                      onClick={() => run(() => setEvent(family.id, eventName, date), "Événement enregistré.")}
                    >
                      Enregistrer
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="label">Lien de la famille</span>
                  <p className="m-0 text-[13px] text-gris">Si le lien a circulé trop loin, créez-en un nouveau : l&apos;ancien ne marchera plus.</p>
                  <button
                    className="btn b-red self-start"
                    disabled={pending}
                    onClick={() => {
                      void confirmDialog({ title: "Créer un nouveau lien ?", message: "L'ancien lien ne fonctionnera plus. Les membres actuels restent dans la famille.", confirmLabel: "Créer un nouveau lien", danger: true }).then((ok) => ok && run(() => regenerateLink(family.id)));
                    }}
                  >
                    Créer un nouveau lien
                  </button>
                </div>
              </div>
            )}

            <div className={section}>
              <h3 className="font-display m-0 text-[22px] font-bold">Membres · {members.length}</h3>
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {members.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-center gap-3 rounded-[14px] border border-sable bg-ivoire px-3 py-2">
                    <Avatar person={m} size={36} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="font-semibold">
                        {m.nickname ?? m.firstName} {m.id === meId && <span className="text-gris-clair">(vous)</span>}
                      </span>
                      <span className="text-xs text-gris-clair">
                        {m.nickname ? `${m.firstName} ${m.lastName ?? ""}`.trim() + " · " : m.lastName ? `${m.firstName} ${m.lastName} · ` : ""}
                        {m.managed ? "Compte géré" : m.role === "ADMIN" ? "Admin" : "Membre"}
                      </span>
                    </span>
                    {m.id !== meId && (
                      <span className="flex flex-wrap gap-1.5">
                        {!m.managed && (
                          <>
                            {isAdmin && (
                              <button
                                className="btn b-soft b-sm"
                                disabled={pending}
                                onClick={() => run(() => setMemberRole(family.id, m.id, m.role === "ADMIN" ? "MEMBRE" : "ADMIN"))}
                              >
                                {m.role === "ADMIN" ? "Retirer admin" : "Nommer admin"}
                              </button>
                            )}
                            <button
                              className="btn b-gold b-sm"
                              disabled={pending}
                              onClick={() =>
                                run(() => createResetLink(family.id, m.id), undefined, (r) => {
                                  if (r.ok && r.url) setResetUrl({ who: m.nickname ?? m.firstName, url: r.url });
                                })
                              }
                            >
                              Mot de passe oublié
                            </button>
                          </>
                        )}
                        {isAdmin && <button
                          className="btn b-quiet b-sm"
                          disabled={pending}
                          onClick={() => {
                            void confirmDialog({ title: `Retirer ${m.nickname ?? m.firstName} de la famille ?`, message: "Ses réservations dans cette famille seront libérées. Son compte n'est pas supprimé : on pourra l'inviter de nouveau avec le lien.", confirmLabel: "Retirer", danger: true }).then((ok) => ok && run(() => removeMember(family.id, m.id), "Membre retiré."));
                          }}
                        >
                          Retirer
                        </button>}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              {resetUrl && (
                <div className="flex flex-col gap-2 rounded-2xl p-4" style={{ background: "#F8EDD2", border: "1px solid #E5CF96" }}>
                  <span className="text-sm font-semibold text-[#4A3810]">
                    Lien pour {resetUrl.who}, à usage unique et valable 24 h. Envoyez-le par SMS ou WhatsApp :
                  </span>
                  <CopyLink url={resetUrl.url} light={false} />
                </div>
              )}
            </div>

            {santa && (
              <div className={section}>
                <SantaSettings familyId={family.id} candidates={santa.candidates} current={santa.current} />
              </div>
            )}

            {myManaged.length > 0 && (
              <div className={section}>
                <h3 className="font-display m-0 text-[22px] font-bold">Mes comptes gérés dans cette famille</h3>
                {myManaged.map((p) => (
                  <label key={p.id} className="chk">
                    <input
                      type="checkbox"
                      defaultChecked={p.inFamily}
                      disabled={pending}
                      onChange={(e) => run(() => setManagedInFamily(family.id, p.id, e.target.checked))}
                    />
                    <Avatar person={p} size={28} /> {p.firstName}
                  </label>
                ))}
              </div>
            )}

            <div className={section}>
              <button
                className="btn b-quiet self-start"
                disabled={pending}
                onClick={() => {
                  void confirmDialog({ title: `Quitter ${family.name} ?`, message: "Vos réservations ici seront libérées et vous n'aurez plus accès aux listes. Vous pourrez revenir avec le lien de la famille.", confirmLabel: "Quitter la famille", danger: true }).then((ok) => ok && run(() => leaveFamily(family.id)));
                }}
              >
                Quitter la famille
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

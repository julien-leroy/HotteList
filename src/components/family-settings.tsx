"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  createResetLink,
  leaveFamily,
  regenerateLink,
  removeMember,
  renameFamily,
  setEventDate,
  setManagedInFamily,
  setMemberRole,
} from "@/app/actions/family";
import { Avatar, type AvatarPerson } from "./avatar";
import { CopyLink } from "./copy-link";
import { IconClose, IconSettings } from "./icons";
import { useAction } from "./toaster";

type Member = AvatarPerson & { id: string; role: "ADMIN" | "MEMBRE"; managed: boolean };

export function FamilySettings({
  family,
  isAdmin,
  meId,
  members,
  myManaged,
}: {
  family: { id: string; name: string; eventDate: string };
  isAdmin: boolean;
  meId: string;
  members: Member[];
  myManaged: (AvatarPerson & { id: string; inFamily: boolean })[];
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(family.name);
  const [date, setDate] = useState(family.eventDate);
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
                <div className="flex flex-wrap items-end gap-2.5">
                  <div className="flex flex-[1_1_240px] flex-col gap-1.5">
                    <label className="label" htmlFor="fs-date">Date de l&apos;événement</label>
                    <input className="input" id="fs-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                  </div>
                  <button className="btn b-soft" disabled={pending || date === family.eventDate} onClick={() => run(() => setEventDate(family.id, date), "Date enregistrée.")}>
                    Enregistrer
                  </button>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="label">Lien de la famille</span>
                  <p className="m-0 text-[13px] text-gris">Si le lien a circulé trop loin, créez-en un nouveau : l&apos;ancien ne marchera plus.</p>
                  <button
                    className="btn b-red self-start"
                    disabled={pending}
                    onClick={() => {
                      if (confirm("Créer un nouveau lien ? L'ancien ne fonctionnera plus.")) run(() => regenerateLink(family.id));
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
                        {m.firstName} {m.lastName ?? ""} {m.id === meId && <span className="text-gris-clair">(vous)</span>}
                      </span>
                      <span className="text-xs text-gris-clair">{m.managed ? "Compte géré" : m.role === "ADMIN" ? "Admin" : "Membre"}</span>
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
                                  if (r.ok && r.url) setResetUrl({ who: m.firstName, url: r.url });
                                })
                              }
                            >
                              Mot de passe oublié
                            </button>
                          </>
                        )}
                        <button
                          className="btn b-quiet b-sm"
                          disabled={pending}
                          onClick={() => {
                            if (confirm(`Retirer ${m.firstName} de la famille ? Ses réservations ici seront libérées. Son compte n'est pas supprimé : on pourra la réinviter avec le lien.`)) run(() => removeMember(family.id, m.id), "Membre retiré.");
                          }}
                        >
                          Retirer
                        </button>
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
                  if (confirm(`Quitter ${family.name} ? Vos souhaits dans cette famille resteront, mais vous n'y aurez plus accès.`)) run(() => leaveFamily(family.id));
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

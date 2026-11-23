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
  addGuestMember,
} from "@/app/actions/family";
import { Avatar, type AvatarPerson } from "./avatar";
import { CopyLink } from "./copy-link";
import { SantaSettings } from "./santa";
import { DownloadMenu } from "./download-menu";
import { IconClose, IconSettings } from "./icons";
import { confirmDialog, useAction } from "./toaster";
import { InfoTip } from "./info-tip";

type Member = AvatarPerson & { id: string; role: "ADMIN" | "MEMBRE"; managed: boolean; guest: boolean; canBeAdmin: boolean; hasLogin: boolean; nickname: string | null };

export function FamilySettings({
  family,
  isAdmin,
  meId,
  members,
  myManaged,
  santa,
  today,
}: {
  family: { id: string; slug: string; name: string; eventName: string; eventDate: string };
  today: string;
  isAdmin: boolean;
  meId: string;
  members: Member[];
  myManaged: (AvatarPerson & { id: string; inFamily: boolean })[];
  santa: { mode: boolean; memberCount: number; current: { budget: string | null; total: number; revealed: number; drawnOn: string } | null } | null;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(family.name);
  const [date, setDate] = useState(family.eventDate);
  const [eventName, setEventName] = useState(family.eventName);
  const [resetUrl, setResetUrl] = useState<{ who: string; url: string } | null>(null);
  const [guestName, setGuestName] = useState("");
  // Liste des membres repliée pour l'admin (réglages d'abord), dépliée pour les autres (c'est tout ce qu'ils voient)
  const [showMembers, setShowMembers] = useState(!isAdmin);
  const { pending, run } = useAction();

  const section = "flex flex-col gap-3 border-t-2 border-dotted border-or pt-4";
  const h3 = "font-display m-0 text-[19px] font-bold";

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="btn b-light" style={{ minHeight: 40 }}>
          <IconSettings /> {isAdmin ? "Réglages de la famille" : "Membres"}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="veil">
          <Dialog.Content className="modal flex max-w-[640px] flex-col gap-4 p-5 sm:p-7" aria-describedby={undefined}>
            <div className="flex items-center justify-between gap-3">
              <Dialog.Title className="font-display m-0 text-[24px] font-bold sm:text-[28px]">{family.name}</Dialog.Title>
              <Dialog.Close asChild>
                <button className="btn b-soft b-icon" aria-label="Fermer" style={{ borderRadius: "50%" }}>
                  <IconClose size={18} />
                </button>
              </Dialog.Close>
            </div>

            {isAdmin && (
              <div className="flex flex-col gap-3.5">
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
                  <div className="flex flex-wrap items-end gap-2.5">
                    <div className="flex flex-[2_1_200px] flex-col gap-1.5">
                      <label className="label" htmlFor="fs-event">Événement</label>
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
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <span className="label flex items-center gap-1">
                    Lien de la famille
                    <InfoTip align="start">Si le lien a circulé trop loin, créez-en un nouveau : l&apos;ancien ne marchera plus.</InfoTip>
                  </span>
                  <button
                    className="btn b-red b-sm"
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

            {santa && (
              <div className={section}>
                <SantaSettings familyId={family.id} mode={santa.mode} memberCount={santa.memberCount} current={santa.current} />
              </div>
            )}

            <div className={`${section} flex-row flex-wrap items-center justify-between`}>
              <h3 className={`${h3} flex items-center gap-1`}>
                Télécharger les listes
                <InfoTip align="start">En PDF ou en Excel. Vous n&apos;y trouvez que ce que vous voyez sur le site.</InfoTip>
              </h3>
              <DownloadMenu familySlug={family.slug} align="end" />
            </div>

            {/* Membres : une ligne repliée (avatars + ajout rapide), la liste complète en un clic */}
            <div className={section}>
              <button
                type="button"
                className="fs-members-head"
                aria-expanded={showMembers}
                aria-controls="fs-members"
                onClick={() => setShowMembers((v) => !v)}
              >
                <span className={h3}>Membres · {members.length}</span>
                <span className="fs-stack" aria-hidden="true">
                  {members.slice(0, 7).map((m) => (
                    <Avatar key={m.id} person={m} size={28} />
                  ))}
                  {members.length > 7 && <span className="fs-more">+{members.length - 7}</span>}
                </span>
                <span className="fs-toggle">{showMembers ? "Replier" : "Voir la liste"}</span>
              </button>

              {isAdmin && (
                <form
                  className="fs-add"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const who = guestName.trim();
                    run(() => addGuestMember(family.id, guestName), `${who} est dans la famille.`, (r) => r.ok && setGuestName(""));
                  }}
                >
                  <input
                    className="input"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Ajouter quelqu'un : son nom"
                    aria-label="Nom de la personne à ajouter"
                    maxLength={40}
                  />
                  <button className="btn b-soft b-sm" disabled={pending || !guestName.trim()}>
                    Ajouter
                  </button>
                  <InfoTip align="end">
                    Sans e-mail ni mot de passe : en ouvrant le lien de la famille, la personne touche son nom. Elle pourra créer son compte plus tard.
                  </InfoTip>
                </form>
              )}

              {showMembers && (
                <ul id="fs-members" className="m-0 flex list-none flex-col gap-1.5 p-0">
                  {members.map((m) => (
                    <li key={m.id} className="flex flex-wrap items-center gap-2.5 rounded-[12px] border border-sable bg-ivoire px-2.5 py-1.5">
                      <Avatar person={m} size={32} />
                      <span className="flex min-w-0 flex-1 flex-col leading-tight">
                        <span className="text-[15px] font-semibold">
                          {m.nickname ?? m.firstName} {m.id === meId && <span className="text-gris-clair">(vous)</span>}
                        </span>
                        <span className="text-xs text-gris-clair">
                          {m.nickname ? `${m.firstName} ${m.lastName ?? ""}`.trim() + " · " : m.lastName ? `${m.firstName} ${m.lastName} · ` : ""}
                          {m.managed ? "Compte géré" : m.role === "ADMIN" ? "Admin" : m.guest ? "Sans compte" : "Membre"}
                        </span>
                      </span>
                      {m.id !== meId && (
                        <span className="flex flex-wrap gap-1.5">
                          {!m.managed && (
                            <>
                              {isAdmin && (m.role === "ADMIN" || m.canBeAdmin) && (
                                <button
                                  className="btn b-soft b-sm"
                                  disabled={pending}
                                  onClick={() => run(() => setMemberRole(family.id, m.id, m.role === "ADMIN" ? "MEMBRE" : "ADMIN"))}
                                >
                                  {m.role === "ADMIN" ? "Retirer admin" : "Nommer admin"}
                                </button>
                              )}
                              {m.hasLogin && (
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
                              )}
                            </>
                          )}
                          {isAdmin && (
                            <button
                              className="btn b-quiet b-sm"
                              disabled={pending}
                              onClick={() => {
                                void confirmDialog({ title: `Retirer ${m.nickname ?? m.firstName} de la famille ?`, message: "Ses réservations dans cette famille seront libérées. Son compte n'est pas supprimé : on pourra l'inviter de nouveau avec le lien.", confirmLabel: "Retirer", danger: true }).then((ok) => ok && run(() => removeMember(family.id, m.id), "Membre retiré."));
                              }}
                            >
                              Retirer
                            </button>
                          )}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
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
                <h3 className={h3}>Mes comptes gérés dans cette famille</h3>
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

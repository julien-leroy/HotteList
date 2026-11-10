"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import type { PersonLite, VisibleGift } from "@/lib/visibility";
import { displayName, formatPrice, relativeDate } from "@/lib/format";
import { Avatar } from "./avatar";
import { GiftVisual, SourceBadge, statusOf } from "./gift-ui";
import { GiftForm } from "./gift-form";
import { CommentBox, CommentText, type MentionPerson } from "./comment-box";
import { IconClose, IconComment, IconExternal, IconHidden } from "./icons";
import { toast, useAction } from "./toaster";
import { addComment, deleteComment, deleteGift, restoreGift, setPurchaseStatus, joinGroup, leaveGift, openToGroup, takeGift } from "@/app/actions/gifts";

export function GiftDialog({
  gift,
  owner,
  ownerIsMe,
  onClose,
  people,
  meId,
}: {
  gift: VisibleGift;
  owner: PersonLite;
  ownerIsMe: boolean;
  onClose: () => void;
  /** membres qu'on peut mentionner (jamais le destinataire, ni moi) */
  people: MentionPerson[];
  meId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [comment, setComment] = useState("");
  const { pending, run } = useAction();
  const st = statusOf(gift);
  const s = gift.secret;

  useEffect(() => setEditing(false), [gift.id]);

  const forLabel = ownerIsMe ? "Dans votre liste" : `Pour ${owner.firstName}`;

  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="veil">
          <Dialog.Content className="modal" aria-describedby={undefined}>
            <Dialog.Close asChild>
              <button className="btn b-soft b-icon" type="button" aria-label="Fermer" style={{ position: "absolute", top: 14, right: 14, zIndex: 2, borderRadius: "50%", background: "#FFFDF7" }}>
                <IconClose size={18} />
              </button>
            </Dialog.Close>

            <div className="flex flex-wrap">
              <GiftVisual
                gift={gift}
                iconSize={160}
                className="ph"
                style={{ flex: "1 1 320px", minHeight: 340, aspectRatio: "auto", minWidth: 0 }}
              >
                <span style={{ position: "absolute", left: 16, top: 16 }}>
                  <SourceBadge site={gift.siteOrigin} />
                </span>
                {st.kind === "OTHER" && <span className="band" style={{ background: "#8A1C26", color: "#FFF9EE", padding: "12px 16px", fontSize: 14 }}>Réservé par {st.by}</span>}
                {st.kind === "MINE" && <span className="band" style={{ background: "#1E6B47", color: "#FFF9EE", padding: "12px 16px", fontSize: 14 }}>Réservé par vous</span>}
                {st.kind === "GROUP" && <span className="band" style={{ background: "#F2C75C", color: "#4A1209", padding: "12px 16px", fontSize: 14 }}>Cadeau à plusieurs</span>}
              </GiftVisual>

              <div className="box-border flex min-w-0 flex-[1.3_1_380px] flex-col gap-4 px-7 pt-7 pb-6">
                <div className="flex flex-wrap items-center gap-2.5 pr-12">
                  <Avatar person={owner} size={30} />
                  <span className="text-sm font-semibold text-gris">{forLabel}</span>
                  {gift.kind === "IDEE" && gift.ideaBy && (
                    <span className="pill" style={{ background: "#1F3A2C", color: "#FFF9EE", minHeight: 26, fontSize: 12 }}>
                      Idée de {gift.ideaBy.firstName} · cachée pour {owner.firstName}
                    </span>
                  )}
                </div>

                {editing ? (
                  <GiftForm
                    mode="edit"
                    compact
                    giftId={gift.id}
                    kind={gift.kind}
                    initial={{
                      url: gift.url ?? "",
                      title: gift.title,
                      price: gift.price ?? "",
                      description: gift.description ?? "",
                      imageUrl: gift.imageUrl ?? "",
                      favorite: gift.favorite,
                    }}
                    onDone={() => setEditing(false)}
                  />
                ) : (
                  <div className="flex flex-col gap-3">
                    <Dialog.Title className="font-display m-0 text-[32px] leading-[1.1] font-bold">{gift.title}</Dialog.Title>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="tag" style={{ fontSize: 15 }}>{formatPrice(gift.price)}</span>
                      {gift.favorite && <span className="text-[13px] font-bold text-rouge">Coup de cœur</span>}
                    </div>
                    {gift.description && <p className="m-0 text-[15px] leading-relaxed whitespace-pre-line text-[#3E3B2E]">{gift.description}</p>}
                    {s?.changedSinceMine && (
                      <p className="m-0 rounded-xl bg-[#F8EDD2] px-3 py-2 text-sm font-semibold text-[#6E500F]">
                        Ce souhait a été modifié depuis votre réservation : vérifiez le modèle ou le prix.
                      </p>
                    )}
                  </div>
                )}

                {/* STATUT ET ACTIONS */}
                {s && !editing && (
                  <div className="flex flex-col gap-3 rounded-2xl p-4" style={{ background: "#FBF4E4", border: "1px solid #EADBB8" }}>
                    {st.kind === "FREE" && (
                      <>
                        <span className="text-sm font-semibold">Personne ne s&apos;en occupe encore.</span>
                        {gift.can.take && (
                          <div className="flex flex-wrap gap-2.5">
                            <button className="btn b-go" disabled={pending} onClick={() => run(() => takeGift(gift.id, "SEUL"), "Réservé ! C'est dans votre liste de courses.", undefined, { run: () => leaveGift(gift.id) })}>Je le réserve</button>
                            <button className="btn b-gold" disabled={pending} onClick={() => run(() => takeGift(gift.id, "A_PLUSIEURS"), "Cadeau à plusieurs lancé.", undefined, { run: () => leaveGift(gift.id) })}>Lancer un cadeau à plusieurs</button>
                          </div>
                        )}
                      </>
                    )}
                    {st.kind === "OTHER" && (
                      <span className="text-sm font-semibold text-bordeaux">{st.by} s&apos;en occupe. Laissez-lui un mot ci-dessous si besoin.</span>
                    )}
                    {st.kind === "MINE" && (
                      <>
                        <span className="text-sm font-semibold text-[#14492F]">Vous l&apos;offrez.</span>
                        <div className="flex flex-wrap gap-2.5">
                          <button className="btn b-gold" disabled={pending} onClick={() => run(() => openToGroup(gift.id), "D'autres peuvent maintenant participer.")}>Ouvrir à d&apos;autres participants</button>
                          <button className="btn b-quiet" disabled={pending} onClick={() => run(() => leaveGift(gift.id), "Réservation annulée.", undefined, { run: () => takeGift(gift.id, "SEUL") })}>Annuler ma réservation</button>
                        </div>
                      </>
                    )}
                    {st.kind === "GROUP" && s && (
                      <>
                        <span className="text-sm font-semibold">Cadeau à plusieurs · {s.participants.length} participant{s.participants.length > 1 ? "s" : ""}</span>
                        <div className="flex flex-wrap gap-1.5">
                          {s.participants.map((p) => (
                            <span key={p.id} className="pill" style={{ background: "#FFFDF7", border: "1px solid #E0C98F", color: "#1F3A2C", paddingLeft: 4 }}>
                              <Avatar person={p} size={24} />
                              {p.firstName}
                            </span>
                          ))}
                        </div>
                        <p className="m-0 text-[13px] text-gris">Qui paie quoi ? Mettez-vous d&apos;accord dans les commentaires.</p>
                        <div className="flex flex-wrap gap-2.5">
                          {!st.mine && gift.can.take && <button className="btn b-gold" disabled={pending} onClick={() => run(() => joinGroup(gift.id), "Vous participez ! C'est dans votre liste de courses.", undefined, { run: () => leaveGift(gift.id) })}>Participer</button>}
                          {st.mine && <button className="btn b-quiet" disabled={pending} onClick={() => run(() => leaveGift(gift.id))}>Ne plus participer</button>}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {s?.myStatus && !editing && (
                  <div className="flex flex-col gap-1.5">
                    <span className="label" id="st-label">Où j&apos;en suis <span className="opt">(visible par vous seul)</span></span>
                    <div className="seg self-start" role="group" aria-labelledby="st-label">
                      {(["A_ACHETER", "ACHETE", "EMBALLE"] as const).map((v) => (
                        <button key={v} type="button" aria-pressed={s.myStatus === v} disabled={pending} onClick={() => run(() => setPurchaseStatus(gift.id, v))}>
                          {v === "A_ACHETER" ? "À acheter" : v === "ACHETE" ? "Acheté" : "Emballé"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {!editing && (
                  <div className="flex flex-wrap items-center gap-2">
                    {gift.url && (
                      <a className="btn b-soft" href={gift.url} target="_blank" rel="noopener noreferrer nofollow" aria-label={`Voir l'article${gift.siteOrigin ? ` sur ${gift.siteOrigin}` : ""} (nouvel onglet)`}>
                        <IconExternal /> Voir l&apos;article
                      </a>
                    )}
                    {gift.can.edit && (
                      <>
                        <button className="btn b-soft" onClick={() => setEditing(true)}>Modifier</button>
                        <button
                          className="btn b-quiet"
                          disabled={pending}
                          onClick={() => {
                            run(() => deleteGift(gift.id), `« ${gift.title} » supprimé.`, (r) => r.ok && onClose(), { run: () => restoreGift(gift.id) });
                          }}
                        >
                          Supprimer
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* COMMENTAIRES */}
            {s && (
              <div className="flex flex-col gap-4 px-7 pt-6 pb-7" style={{ borderTop: "2px dotted #D9A93E", background: "#FFFAF0" }}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-display m-0 flex items-center gap-2 text-[22px] font-bold">
                    <IconComment size={20} style={{ color: "#B3202E" }} />
                    Commentaires · {s.comments.length}
                  </h3>
                  <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#4A4A3A]">
                    <IconHidden size={16} />
                    {owner.firstName} ne voit pas ces commentaires
                  </span>
                </div>
                {s.comments.length === 0 && (
                  <p className="m-0 text-sm text-gris">Pas encore de commentaire. Une question sur la taille, le budget, qui achète ?</p>
                )}
                <div className="flex flex-col gap-3">
                  {s.comments.map((c) => (
                    <div key={c.id} className="flex items-start gap-3">
                      <Avatar person={c.author} size={36} />
                      <div className="flex min-w-0 flex-1 flex-col gap-1 border border-[#EADBB8] bg-papier px-3.5 py-2.5" style={{ borderRadius: "4px 14px 14px 14px" }}>
                        <span className="flex items-center justify-between gap-2 text-[13px]">
                          <span>
                            <strong>{displayName(c.author)}</strong> <span className="text-gris-clair">· {relativeDate(c.createdAt)}</span>
                          </span>
                          {c.mine && (
                            <button className="cursor-pointer border-0 bg-transparent text-xs text-gris-clair hover:text-rouge-doux" onClick={() => run(() => deleteComment(c.id))}>
                              Supprimer
                            </button>
                          )}
                        </span>
                        <span className="text-[15px] leading-normal whitespace-pre-line"><CommentText text={c.text} meId={meId} /></span>
                      </div>
                    </div>
                  ))}
                </div>
                {gift.can.comment && (
                  <form
                    className="flex flex-wrap items-end gap-2.5"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!comment.trim()) return toast("Le commentaire est vide.", true);
                      run(() => addComment(gift.id, comment), undefined, (r) => r.ok && setComment(""));
                    }}
                  >
                    <div className="flex-[1_1_300px]">
                      <CommentBox value={comment} onChange={setComment} people={people} disabled={pending} />
                    </div>
                    <button className="btn b-red" type="submit" disabled={pending}>Envoyer</button>
                  </form>
                )}
              </div>
            )}
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { PersonLite, VisibleGift } from "@/lib/visibility";
import { formatPrice } from "@/lib/format";
import { Avatar } from "./avatar";
import { GiftVisual, SourceBadge, statusOf, tintFor, type Status } from "./gift-ui";
import { AddGiftDialog } from "./gift-form";
import { GiftDialog } from "./gift-dialog";
import { IconBookmark, IconComment, IconGrid, IconGroup, IconHidden, IconList, IconPlus } from "./icons";
import { useAction } from "./toaster";
import { priceValue } from "./price";
import { mentionLabels } from "@/lib/mentions";
import type { MentionPerson } from "./comment-box";
import { joinGroup, leaveGift, takeGift } from "@/app/actions/gifts";
import { setNickname } from "@/app/actions/family";
import { InlineEdit } from "./inline-edit";

type Sort = "ordre" | "coeur" | "prix-asc" | "prix-desc";
type Budget = "tous" | "20" | "50" | "100" | "plus";

function arrange(list: VisibleGift[], sort: Sort, budget: Budget) {
  let out = list;
  if (budget !== "tous") {
    out = out.filter((g) => {
      const v = priceValue(g.price);
      if (v == null) return true; // prix libre : toujours affiché
      return budget === "plus" ? v > 100 : v <= Number(budget);
    });
  }
  if (sort === "ordre") return out;
  const val = (g: VisibleGift) => priceValue(g.price);
  return out.slice().sort((a, b) => {
    if (sort === "coeur") return Number(b.favorite) - Number(a.favorite);
    const va = val(a), vb = val(b);
    if (va == null) return 1;
    if (vb == null) return -1;
    return sort === "prix-asc" ? va - vb : vb - va;
  });
}

export type Section = {
  person: PersonLite;
  isMe: boolean;
  isManaged: boolean;
  managerName: string | null;
  /** Prénom + nom réels (le titre affiche le pseudo de la famille s'il y en a un). */
  realName: string;
  nickname: string | null;
  gifts: VisibleGift[];
};

type Props = {
  familyId: string;
  familySlug: string;
  viewerId: string;
  sections: Section[];
  openGiftId: string | null;
};

/** Même calcul que le serveur : membres avec compte, hors destinataire ; puis on retire moi-même. */
function mentionPeople(sections: Section[], recipientId: string, meId: string): MentionPerson[] {
  const candidates = sections.filter((s) => !s.managerName && s.person.id !== recipientId).map((s) => s.person);
  const labels = mentionLabels(candidates);
  return labels
    .map((l) => ({ ...l, person: candidates.find((c) => c.id === l.id)! }))
    .filter((p) => p.id !== meId);
}

export function FamilyBoard({ familyId, familySlug, viewerId, sections, openGiftId }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"cards" | "list">("cards");
  const [onlyFree, setOnlyFree] = useState(false);
  const [sort, setSort] = useState<Sort>("ordre");
  const [budget, setBudget] = useState<Budget>("tous");
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    try {
      const m = localStorage.getItem("hl-mode");
      if (m === "list" || m === "cards") setMode(m);
    } catch {}
  }, []);
  function pickMode(m: "cards" | "list") {
    setMode(m);
    try {
      localStorage.setItem("hl-mode", m);
    } catch {}
  }

  const all = sections.flatMap((s) => s.gifts);
  const opened = openGiftId ? all.find((g) => g.id === openGiftId) ?? null : null;
  const openedSection = opened ? sections.find((s) => s.person.id === opened.recipientId) ?? null : null;
  const open = (id: string) => router.push(`/f/${familySlug}?cadeau=${id}`, { scroll: false });
  const close = () => router.push(`/f/${familySlug}`, { scroll: false });

  return (
    <>
      {/* BARRE D'OUTILS */}
      <div className="mx-auto max-w-[1200px] px-6 pt-5">
        <div className="panel flex flex-wrap items-center justify-between gap-3.5 p-3">
          <nav aria-label="Aller à la liste de" className="flex flex-wrap gap-2">
            {sections.map((s) => (
              <a key={s.person.id} className="chip" href={`#p-${s.person.id}`}>
                <Avatar person={s.person} size={32} />
                {s.isMe ? "Moi" : s.person.firstName}
              </a>
            ))}
          </nav>
          <div className="flex flex-wrap items-center gap-3.5">
            <label className="sr-only" htmlFor="tri">Trier</label>
            <select id="tri" className="input" style={{ minHeight: 44, width: "auto", fontSize: 14, fontWeight: 600 }} value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="ordre">Ordre de la liste</option>
              <option value="coeur">Coups de cœur d&apos;abord</option>
              <option value="prix-asc">Prix croissant</option>
              <option value="prix-desc">Prix décroissant</option>
            </select>
            <label className="sr-only" htmlFor="budget">Budget</label>
            <select id="budget" className="input" style={{ minHeight: 44, width: "auto", fontSize: 14, fontWeight: 600 }} value={budget} onChange={(e) => setBudget(e.target.value as Budget)}>
              <option value="tous">Tous les prix</option>
              <option value="20">Jusqu&apos;à 20 €</option>
              <option value="50">Jusqu&apos;à 50 €</option>
              <option value="100">Jusqu&apos;à 100 €</option>
              <option value="plus">Plus de 100 €</option>
            </select>
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={onlyFree} onChange={(e) => setOnlyFree(e.target.checked)} style={{ width: 20, height: 20, accentColor: "#1E6B47" }} />
              Seulement les disponibles
            </label>
            <div className="seg" role="group" aria-label="Affichage">
              <button type="button" aria-pressed={mode === "cards"} onClick={() => pickMode("cards")}>
                <IconGrid /> Cartes
              </button>
              <button type="button" aria-pressed={mode === "list"} onClick={() => pickMode("list")}>
                <IconList /> Liste
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* LISTES PAR PERSONNE */}
      <main className="mx-auto flex max-w-[1200px] flex-col gap-12 px-6 pt-7 pb-24">
        {sections.map((s) => {
          const canWish = s.isMe || s.isManaged;
          const gifts = arrange(
            onlyFree
              ? s.gifts.filter((g) => {
                  const st = statusOf(g);
                  return st.kind === "HIDDEN" || st.kind === "FREE" || (st.kind === "GROUP" && !st.mine);
                })
              : s.gifts,
            sort,
            budget,
          );
          const wishes = s.gifts.filter((g) => g.kind === "SOUHAIT").length;
          const ideas = s.gifts.length - wishes;
          const sub = s.isMe
            ? `Votre liste · ${wishes} souhait${wishes > 1 ? "s" : ""}`
            : `${wishes} souhait${wishes > 1 ? "s" : ""}${ideas ? ` · ${ideas} idée${ideas > 1 ? "s" : ""} des autres` : ""}${s.managerName ? ` · compte géré par ${s.isManaged ? "vous" : s.managerName}` : ""}`;
          const plusLabel = canWish ? (s.isMe ? "Ajouter un souhait" : `Ajouter un souhait pour ${s.person.firstName}`) : `Proposer une idée pour ${s.person.firstName}`;
          const plusShort = canWish ? "Ajouter un souhait" : "Proposer une idée";
          const isAdding = adding === s.person.id;

          return (
            <section key={s.person.id} id={`p-${s.person.id}`} className="flex flex-col gap-[18px]" style={{ scrollMarginTop: 16 }}>
              <div className="flex flex-wrap items-center justify-between gap-3.5 pb-3.5" style={{ borderBottom: "2px dotted #D9A93E" }}>
                <div className="flex items-center gap-3.5">
                  <Avatar person={s.person} size={56} style={{ border: "3px solid #FFFDF7", boxShadow: "0 0 0 2px #D9A93E", fontSize: 18 }} />
                  <div className="flex flex-col gap-0.5">
                    {s.isMe ? (
                      <h2 className="list-title text-[clamp(34px,9vw,44px)]">Ma liste</h2>
                    ) : (
                      <InlineEdit
                        as="h2"
                        className="list-title text-[clamp(34px,9vw,44px)]"
                        value={s.nickname ?? ""}
                        display={s.person.firstName}
                        placeholder={s.realName.split(" ")[0]}
                        allowEmpty
                        label={`Changer le nom de ${s.realName} dans cette famille`}
                        success="Nom modifié pour toute la famille."
                        onSave={(v) => setNickname(familyId, s.person.id, v)}
                      />
                    )}
                    <span className="text-sm text-gris">
                      {s.isMe ? (
                        <>
                          Vous apparaissez comme{" "}
                          <InlineEdit
                            className="font-semibold text-encre"
                            value={s.nickname ?? ""}
                            display={`« ${s.person.firstName} »`}
                            placeholder={s.realName.split(" ")[0]}
                            allowEmpty
                            label="Changer mon nom dans cette famille"
                            success="Nom modifié pour toute la famille."
                            onSave={(v) => setNickname(familyId, s.person.id, v)}
                          />{" "}
                          · {sub}
                        </>
                      ) : (
                        <>
                          {s.nickname && <>{s.realName} · </>}
                          {sub}
                        </>
                      )}
                    </span>
                  </div>
                </div>
                <button className="btn b-soft" type="button" onClick={() => setAdding(s.person.id)}>
                  <IconPlus /> {plusShort}
                </button>
              </div>

              {s.isMe && (
                <p className="m-0 flex items-center gap-2 text-sm font-semibold text-sapin">
                  <IconHidden size={18} />
                  Chut ! Sur vos souhaits, les réservations, les commentaires et les idées des autres restent cachés.
                </p>
              )}

              <AddGiftDialog
                open={isAdding}
                onClose={() => setAdding(null)}
                familyId={familyId}
                recipientId={s.person.id}
                kind={canWish ? "SOUHAIT" : "IDEE"}
                existing={s.gifts.map((g) => ({ title: g.title, url: g.url }))}
                title={canWish ? (s.isMe ? "Nouveau souhait" : `Nouveau souhait pour ${s.person.firstName}`) : `Une idée pour ${s.person.firstName}`}
                hint={canWish ? (s.isMe ? "Collez un lien : le titre, l'image et le prix se remplissent tout seuls. Toute la famille le verra." : `Collez un lien : le titre, l'image et le prix se remplissent tout seuls.`) : `${s.person.firstName} ne verra jamais cette idée. Le reste de la famille pourra la réserver et la commenter.`}
              />

              {gifts.length === 0 && s.gifts.length > 0 && (
                <p className="m-0 text-sm text-gris">{onlyFree ? "Rien de disponible ici avec ces filtres." : "Rien dans ce budget ici."}</p>
              )}

              {mode === "cards" ? (
                <div className="grid gap-[18px]" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(min(210px,100%),1fr))" }}>
                  {gifts.map((g) => (
                    <GiftCard key={g.id} gift={g} onOpen={() => open(g.id)} />
                  ))}
                  <button className="plus" type="button" onClick={() => setAdding(s.person.id)} style={gifts.length ? undefined : { minHeight: 200 }}>
                    <span className="orb"><IconPlus size={28} /></span>
                    {plusLabel}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {gifts.map((g) => (
                    <GiftRow key={g.id} gift={g} onOpen={() => open(g.id)} />
                  ))}
                  {
                    <button
                      type="button"
                      onClick={() => setAdding(s.person.id)}
                      className="flex min-h-14 cursor-pointer items-center justify-center gap-2.5 rounded-[14px] bg-ivoire text-[15px] font-semibold text-[#8A1C26]"
                      style={{ border: "2px dashed #D9A93E" }}
                    >
                      <IconPlus size={18} /> {plusLabel}
                    </button>
                  }
                </div>
              )}
            </section>
          );
        })}
      </main>

      {opened && openedSection && (
        <GiftDialog
          gift={opened}
          owner={openedSection.person}
          ownerIsMe={openedSection.isMe}
          onClose={close}
          meId={viewerId}
          people={mentionPeople(sections, opened.recipientId, viewerId)}
        />
      )}
      {openGiftId && !opened && <MissingGift onClose={close} />}
    </>
  );
}

function MissingGift({ onClose }: { onClose: () => void }) {
  return (
    <div className="veil" onClick={onClose}>
      <div className="modal max-w-[460px] p-8" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display m-0 mb-2 text-2xl font-bold">Ce cadeau n&apos;est plus là</h2>
        <p className="m-0 mb-5 text-gris">Il a peut-être été retiré, déplacé ou archivé.</p>
        <button className="btn b-soft" onClick={onClose}>Fermer</button>
      </div>
    </div>
  );
}

// ---------- Actions rapides communes aux cartes et aux lignes ----------

/** Annuler « Ne plus participer » : rejoindre, ou relancer le cadeau à plusieurs si j'étais le dernier. */
async function rejoin(giftId: string) {
  const r = await joinGroup(giftId);
  return r.ok ? r : takeGift(giftId, "A_PLUSIEURS");
}

const STATUS_LABEL = { A_ACHETER: "à acheter", ACHETE: "acheté", EMBALLE: "emballé" } as const;

function QuickActions({ gift, st, compact }: { gift: VisibleGift; st: Status; compact?: boolean }) {
  const { pending, run } = useAction();
  if (!gift.can.take || st.kind === "HIDDEN") return null;
  return (
    <>
      {st.kind === "FREE" && (
        <>
          <button className="btn b-go" type="button" disabled={pending} style={compact ? undefined : { flex: 1 }} onClick={() => run(() => takeGift(gift.id, "SEUL"), "Réservé ! C'est dans votre liste de courses.", undefined, { run: () => leaveGift(gift.id) })}>
            {!compact && <IconBookmark />} Réserver
          </button>
          <button
            className={`btn b-gold${compact ? "" : " b-icon"}`}
            type="button"
            disabled={pending}
            aria-label="Offrir à plusieurs"
            title="Offrir à plusieurs"
            onClick={() => run(() => takeGift(gift.id, "A_PLUSIEURS"), "Cadeau à plusieurs lancé.", undefined, { run: () => leaveGift(gift.id) })}
          >
            {compact ? "À plusieurs" : <IconGroup size={18} />}
          </button>
        </>
      )}
      {st.kind === "MINE" && (
        <button className="btn b-quiet" type="button" disabled={pending} onClick={() => run(() => leaveGift(gift.id), "Réservation annulée.", undefined, { run: () => takeGift(gift.id, "SEUL") })}>
          {compact ? "Annuler" : "Annuler ma réservation"}
        </button>
      )}
      {st.kind === "GROUP" && !st.mine && (
        <button className="btn b-gold" type="button" disabled={pending} style={compact ? undefined : { flex: 1 }} onClick={() => run(() => joinGroup(gift.id), "Vous participez ! C'est dans votre liste de courses.", undefined, { run: () => leaveGift(gift.id) })}>
          Participer
        </button>
      )}
      {st.kind === "GROUP" && st.mine && (
        <button className="btn b-quiet" type="button" disabled={pending} onClick={() => run(() => leaveGift(gift.id), "Vous ne participez plus.", undefined, { run: () => rejoin(gift.id) })}>
          Ne plus participer
        </button>
      )}
    </>
  );
}

function GiftCard({ gift, onOpen }: { gift: VisibleGift; onOpen: () => void }) {
  const st = statusOf(gift);
  const taken = st.kind === "OTHER" || st.kind === "MINE";
  const nb = gift.secret?.comments.length ?? 0;
  return (
    <article className={`card${taken ? " taken" : ""}`}>
      <button className="open" type="button" onClick={onOpen} aria-label={`Ouvrir : ${gift.title}`}>
        <GiftVisual gift={gift} taken={taken}>
          <SourceBadge site={gift.siteOrigin} />
          {gift.kind === "IDEE" && gift.ideaBy && <span className="idea">Idée de {gift.ideaBy.firstName}</span>}
          {st.kind === "OTHER" && <span className="band" style={{ background: "#8A1C26", color: "#FFF9EE" }}>Réservé par {st.by}</span>}
          {st.kind === "MINE" && <span className="band" style={{ background: "#1E6B47", color: "#FFF9EE" }}>Réservé par vous · {STATUS_LABEL[gift.secret!.myStatus ?? "A_ACHETER"]}</span>}
          {st.kind === "GROUP" && <span className="band" style={{ background: "#FFCB2E", color: "#4A1209" }}>À plusieurs · {st.people}{st.mine ? ` · ${STATUS_LABEL[gift.secret!.myStatus ?? "A_ACHETER"]}` : ""}</span>}
          {gift.isNew && <span className="idea" style={{ background: "#CF2B35", left: gift.kind === "IDEE" ? 10 : undefined, right: gift.kind === "IDEE" ? undefined : 10, top: gift.kind === "IDEE" ? 40 : 10 }}>Nouveau</span>}
        </GiftVisual>
        <span className="flex flex-1 flex-col gap-2.5 px-3.5 pt-3.5 pb-2.5">
          <span className="flex items-start justify-between gap-2">
            <span className="line-clamp-2 text-base leading-[1.35] font-semibold">{gift.title}</span>
            {nb > 0 && (
              <span className="cm" title={`${nb} commentaire(s)`}>
                <IconComment /> {nb}
              </span>
            )}
          </span>
          <span className="mt-auto flex items-center justify-between gap-2">
            <span className="tag">{formatPrice(gift.price)}</span>
            {gift.favorite && <span className="text-xs font-bold text-rouge">Coup de cœur</span>}
          </span>
          {gift.secret?.changedSinceMine && <span className="text-xs font-semibold text-[#8A6516]">Modifié depuis votre réservation</span>}
        </span>
      </button>
      {gift.can.take && st.kind !== "HIDDEN" && (
        <div className="flex gap-2 px-3.5 pb-3.5">
          <QuickActions gift={gift} st={st} />
          {st.kind === "OTHER" && (
            <button className="btn b-soft" type="button" onClick={onOpen} style={{ flex: 1 }}>
              Voir les détails
            </button>
          )}
        </div>
      )}
    </article>
  );
}

function GiftRow({ gift, onOpen }: { gift: VisibleGift; onOpen: () => void }) {
  const st = statusOf(gift);
  const nb = gift.secret?.comments.length ?? 0;
  const meta = [
    gift.siteOrigin,
    gift.kind === "IDEE" && gift.ideaBy ? `Idée de ${gift.ideaBy.firstName}` : null,
    gift.favorite ? "Coup de cœur" : null,
    gift.secret?.changedSinceMine ? "Modifié depuis votre réservation" : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const tint = tintFor(gift.id);
  return (
    <div className="row">
      <button className="rowopen" type="button" onClick={onOpen}>
        <GiftVisual gift={gift} iconSize={32} className="ph" style={{ width: 56, height: 56, aspectRatio: "1", borderRadius: 12, flex: "none", background: gift.imageUrl ? "#fff" : tint.bg }} />
        <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <span className="flex flex-wrap items-center gap-2">
            <span className="rt text-base font-semibold">{gift.title}</span>
            {gift.isNew && <span className="pill" style={{ background: "#CF2B35", color: "#FFF9EE", minHeight: 22, fontSize: 11, padding: "0 8px" }}>Nouveau</span>}
            {nb > 0 && (
              <span className="cm">
                <IconComment size={12} />
                {nb}
              </span>
            )}
          </span>
          {meta && <span className="text-[13px] text-gris">{meta}</span>}
        </span>
        <span className="tag">{formatPrice(gift.price)}</span>
      </button>
      {st.kind !== "HIDDEN" && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {st.kind === "OTHER" && <span className="pill" style={{ background: "#F6DCDD", color: "#7E1621" }}>Réservé par {st.by}</span>}
          {st.kind === "GROUP" && <span className="pill" style={{ background: "#F6E7C1", color: "#5C4214" }}>À plusieurs · {st.people}</span>}
          {st.kind === "MINE" && <span className="pill" style={{ background: "#DCEDE2", color: "#14492F" }}>Réservé par vous · {STATUS_LABEL[gift.secret!.myStatus ?? "A_ACHETER"]}</span>}
          <QuickActions gift={gift} st={st} compact />
        </div>
      )}
    </div>
  );
}


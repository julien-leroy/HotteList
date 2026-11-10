"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, type CurrentUser } from "@/lib/auth";
import { getMembership, loadGiftForAction, requireMember, viewerOf } from "@/lib/queries";
import { canAddIdeaFor, canAddWishFor, canEditGift, canInteract } from "@/lib/visibility";
import { hostnameOf } from "@/lib/utils";
import { displayName } from "@/lib/format";
import { encodeMentions, mentionIds, mentionLabels, toPlain } from "@/lib/mentions";
import { mailEnabled, sendMentionEmail } from "@/lib/mail";
import { hit } from "@/lib/rate-limit";
import type { ActionResult } from "./family";

function fail(e: unknown): ActionResult {
  if (e instanceof z.ZodError) return { ok: false, error: e.issues[0].message };
  return { ok: false, error: e instanceof Error ? e.message : "Une erreur est survenue." };
}

function done(): ActionResult {
  revalidatePath("/", "layout");
  return { ok: true };
}

const httpUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((v) => /^https?:\/\//i.test(v), "Le lien doit commencer par http:// ou https://");

const giftSchema = z.object({
  title: z.string().trim().min(1, "Donnez un titre.").max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  url: httpUrl.optional().nullable().or(z.literal("")),
  price: z.string().trim().max(30).optional().nullable(),
  imageUrl: httpUrl.optional().nullable().or(z.literal("")),
  favorite: z.boolean().optional(),
});

export type GiftInput = z.input<typeof giftSchema>;

function clean(input: z.output<typeof giftSchema>) {
  return {
    title: input.title,
    description: input.description || null,
    url: input.url || null,
    price: input.price || null,
    imageUrl: input.imageUrl || null,
    siteOrigin: hostnameOf(input.url || null),
    favorite: Boolean(input.favorite),
  };
}

async function notify(userIds: string[], text: string, link?: string) {
  if (!userIds.length) return;
  await db.notification.createMany({ data: userIds.map((userId) => ({ userId, text, link })) });
}

// ---------- Créer, modifier, supprimer ----------

export async function createGift(
  familyId: string,
  recipientId: string,
  kind: "SOUHAIT" | "IDEE",
  input: GiftInput,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const viewer = viewerOf(user);
    await requireMember(user.id, familyId);
    if (!(await getMembership(recipientId, familyId))) throw new Error("Cette personne n'est pas dans la famille.");
    if (kind === "SOUHAIT" && !canAddWishFor(viewer, recipientId)) throw new Error("Vous ne pouvez pas écrire ses souhaits.");
    if (kind === "IDEE" && !canAddIdeaFor(viewer, recipientId)) throw new Error("Vous ne pouvez pas vous proposer une idée.");
    const data = clean(giftSchema.parse(input));
    const last = await db.gift.aggregate({
      where: { familyId, recipientId, archivedAt: null, deletedAt: null },
      _max: { position: true },
    });
    await db.gift.create({
      data: { ...data, familyId, recipientId, kind, createdById: user.id, position: (last._max.position ?? -1) + 1 },
    });
    return done();
  } catch (e) {
    return fail(e);
  }
}

export async function updateGift(giftId: string, input: GiftInput): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const gift = await loadGiftForAction(user, giftId);
    if (!canEditGift(viewerOf(user), gift)) throw new Error("Vous ne pouvez pas modifier ce cadeau.");
    const data = clean(giftSchema.parse(input));
    const changed =
      data.title !== gift.title ||
      data.description !== gift.description ||
      data.url !== gift.url ||
      data.price !== gift.price;
    await db.gift.update({
      where: { id: giftId },
      data: { ...data, ...(changed ? { contentUpdatedAt: new Date() } : {}) },
    });
    return done();
  } catch (e) {
    return fail(e);
  }
}

export async function toggleFavorite(giftId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const gift = await loadGiftForAction(user, giftId);
    if (!canEditGift(viewerOf(user), gift)) throw new Error("Vous ne pouvez pas modifier ce cadeau.");
    await db.gift.update({ where: { id: giftId }, data: { favorite: !gift.favorite } });
    return done();
  } catch (e) {
    return fail(e);
  }
}

export async function deleteGift(giftId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const gift = await loadGiftForAction(user, giftId);
    if (!canEditGift(viewerOf(user), gift)) throw new Error("Vous ne pouvez pas supprimer ce cadeau.");
    const others = gift.participants.map((p) => p.userId).filter((id) => id !== user.id);
    // Suppression « douce » : le bouton Annuler du toast peut la défaire.
    await db.gift.update({ where: { id: giftId }, data: { deletedAt: new Date() } });
    await notify(others, deletedText(gift.title), "/courses");
    return done();
  } catch (e) {
    return fail(e);
  }
}

function deletedText(title: string) {
  return `« ${title} », que vous aviez réservé, a été retiré de la liste.`;
}

/** Annule une suppression faite il y a moins de 10 minutes. */
export async function restoreGift(giftId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const gift = await db.gift.findUnique({ where: { id: giftId } });
    if (!gift?.deletedAt || Date.now() - gift.deletedAt.getTime() > 10 * 60_000) throw new Error("Trop tard pour annuler.");
    await requireMember(user.id, gift.familyId);
    if (!canEditGift(viewerOf(user), gift)) throw new Error("Vous ne pouvez pas restaurer ce cadeau.");
    await db.$transaction([
      db.gift.update({ where: { id: giftId }, data: { deletedAt: null } }),
      db.notification.deleteMany({ where: { text: deletedText(gift.title), createdAt: { gte: gift.deletedAt } } }),
    ]);
    return done();
  } catch (e) {
    return fail(e);
  }
}

/** Contexte d'un cadeau pour rédiger une notification : destinataire et lien. */
async function giftContext(giftId: string) {
  const g = await db.gift.findUniqueOrThrow({
    where: { id: giftId },
    include: { recipient: { select: { firstName: true } }, family: { select: { slug: true } }, comments: { select: { authorId: true } } },
  });
  return { title: g.title, recipientId: g.recipientId, who: g.recipient.firstName, link: `/f/${g.family.slug}?cadeau=${g.id}`, commenters: g.comments.map((c) => c.authorId) };
}

/** Mon statut d'achat sur un cadeau que j'offre (visible par moi seul). */
export async function setPurchaseStatus(giftId: string, status: "A_ACHETER" | "ACHETE" | "EMBALLE"): Promise<ActionResult> {
  try {
    const user = await requireUser();
    z.enum(["A_ACHETER", "ACHETE", "EMBALLE"]).parse(status);
    const res = await db.giftParticipant.updateMany({ where: { giftId, userId: user.id }, data: { status } });
    if (res.count !== 1) throw new Error("Vous ne participez pas à ce cadeau.");
    return done();
  } catch (e) {
    return fail(e);
  }
}

// ---------- Réserver, à plusieurs ----------

async function interactable(user: CurrentUser, giftId: string) {
  const gift = await loadGiftForAction(user, giftId);
  if (!canInteract(viewerOf(user), gift)) throw new Error("Impossible sur un cadeau qui vous est destiné.");
  return gift;
}

/** Réserver seul, ou lancer un cadeau à plusieurs. Une seule réservation passe, même en simultané. */
export async function takeGift(giftId: string, mode: "SEUL" | "A_PLUSIEURS"): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await interactable(user, giftId);
    await db.$transaction(async (tx) => {
      const res = await tx.gift.updateMany({
        where: { id: giftId, takeMode: "AUCUN", archivedAt: null, deletedAt: null },
        data: { takeMode: mode },
      });
      if (res.count !== 1) throw new Error("Quelqu'un vient de s'en occuper. La page a été mise à jour.");
      await tx.giftParticipant.create({ data: { giftId, userId: user.id } });
    });
    return done();
  } catch (e) {
    revalidatePath("/", "layout");
    return fail(e);
  }
}

export async function joinGroup(giftId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const gift = await interactable(user, giftId);
    if (gift.takeMode !== "A_PLUSIEURS") throw new Error("Ce cadeau n'est pas ouvert à plusieurs.");
    const already = gift.participants.some((p) => p.userId === user.id);
    await db.giftParticipant.upsert({
      where: { giftId_userId: { giftId, userId: user.id } },
      create: { giftId, userId: user.id },
      update: {},
    });
    if (!already) {
      const ctx = await giftContext(giftId);
      await notify(
        gift.participants.map((p) => p.userId).filter((id) => id !== user.id),
        `${user.firstName} participe aussi à « ${ctx.title} » pour ${ctx.who}.`,
        ctx.link,
      );
    }
    return done();
  } catch (e) {
    return fail(e);
  }
}

/** Annuler ma réservation ou ne plus participer. */
export async function leaveGift(giftId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await interactable(user, giftId);
    await db.$transaction(async (tx) => {
      await tx.giftParticipant.deleteMany({ where: { giftId, userId: user.id } });
      const left = await tx.giftParticipant.count({ where: { giftId } });
      if (left === 0) await tx.gift.update({ where: { id: giftId }, data: { takeMode: "AUCUN" } });
    });
    return done();
  } catch (e) {
    return fail(e);
  }
}

/** Ma réservation seule devient un cadeau à plusieurs. */
export async function openToGroup(giftId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const gift = await interactable(user, giftId);
    if (gift.takeMode !== "SEUL" || !gift.participants.some((p) => p.userId === user.id)) {
      throw new Error("Seule la personne qui a réservé peut l'ouvrir à d'autres.");
    }
    await db.gift.update({ where: { id: giftId }, data: { takeMode: "A_PLUSIEURS" } });
    return done();
  } catch (e) {
    return fail(e);
  }
}

// ---------- Commentaires ----------

/** Personnes qu'on peut mentionner sur un cadeau : membres avec un compte, jamais le destinataire. */
async function mentionablesFor(familyId: string, recipientId: string) {
  const members = await db.membership.findMany({
    where: { familyId, userId: { not: recipientId }, user: { managedById: null } },
    include: { user: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: { joinedAt: "asc" },
  });
  return mentionLabels(members.map((m) => m.user));
}

export async function addComment(giftId: string, text: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await interactable(user, giftId);
    const typed = z.string().trim().min(1, "Le commentaire est vide.").max(1000).parse(text);
    const gift = await db.gift.findUniqueOrThrow({
      where: { id: giftId },
      include: { participants: true, family: { select: { name: true, slug: true } } },
    });
    const ctx = await giftContext(giftId);

    // Mentions recalculées ici, avec la liste autorisée : on ne fait jamais confiance au navigateur.
    const allowed = await mentionablesFor(gift.familyId, gift.recipientId);
    const stored = encodeMentions(toPlain(typed), allowed);
    await db.comment.create({ data: { giftId, authorId: user.id, text: stored } });
    const plain = toPlain(stored);
    const short = plain.length > 60 ? plain.slice(0, 57) + "…" : plain;

    const mentioned = mentionIds(stored).filter((id) => id !== user.id && id !== gift.recipientId);
    if (mentioned.length) {
      await notify(mentioned, `${user.firstName} vous a mentionné sur « ${ctx.title} » pour ${ctx.who} : « ${short} »`, ctx.link);
      if (mailEnabled() && hit(`mention-mail:${user.id}`, 30, 60 * 60_000)) {
        const people = await db.user.findMany({
          where: { id: { in: mentioned }, emailVerifiedAt: { not: null }, emailMentions: true, managedById: null },
          select: { id: true, firstName: true, email: true },
        });
        const base = (process.env.APP_URL ?? "").replace(/\/$/, "");
        await Promise.all(
          people.map((p) =>
            sendMentionEmail(p.email!, {
              firstName: p.firstName,
              author: user.firstName,
              comment: plain,
              meLabel: allowed.find((a) => a.id === p.id)?.label ?? p.firstName,
              labels: allowed.filter((a) => mentionIds(stored).includes(a.id)).map((a) => a.label),
              gift: { title: gift.title, price: gift.price, imageUrl: gift.imageUrl, siteOrigin: gift.siteOrigin },
              recipientName: ctx.who,
              familyName: gift.family.name,
              giftUrl: `${base}${ctx.link}`,
              settingsUrl: `${base}/profil#compte`,
            }).catch((e) => console.error("[mail] mention", e)),
          ),
        );
      }
    }

    // Préviens aussi ceux qui offrent ce cadeau et ceux qui en ont déjà parlé (jamais le destinataire).
    const to = new Set([...gift.participants.map((p) => p.userId), ...ctx.commenters]);
    to.delete(user.id);
    to.delete(ctx.recipientId);
    for (const id of mentioned) to.delete(id);
    await notify([...to], `${user.firstName} a commenté « ${ctx.title} » pour ${ctx.who} : « ${short} »`, ctx.link);
    return done();
  } catch (e) {
    return fail(e);
  }
}

export async function deleteComment(commentId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const c = await db.comment.findUnique({ where: { id: commentId } });
    if (!c || c.authorId !== user.id) throw new Error("Vous ne pouvez supprimer que vos commentaires.");
    await db.comment.delete({ where: { id: commentId } });
    return done();
  } catch (e) {
    return fail(e);
  }
}

// ---------- Profil : déplacer, copier, ordonner ----------

async function editableWish(user: CurrentUser, giftId: string) {
  const gift = await loadGiftForAction(user, giftId);
  if (gift.kind !== "SOUHAIT" || !canEditGift(viewerOf(user), gift)) throw new Error("Vous ne pouvez pas déplacer ce souhait.");
  return gift;
}

async function applyOrder(familyId: string, recipientId: string, orderedIds: string[]) {
  const own = await db.gift.findMany({
    where: { familyId, recipientId, kind: "SOUHAIT", archivedAt: null, deletedAt: null },
    select: { id: true },
  });
  const ownSet = new Set(own.map((g) => g.id));
  const ids = orderedIds.filter((id) => ownSet.has(id));
  for (const g of own) if (!ids.includes(g.id)) ids.push(g.id);
  await db.$transaction(ids.map((id, position) => db.gift.update({ where: { id }, data: { position } })));
}

/** Change l'ordre des souhaits d'une personne dans une famille. */
export async function reorderWishes(familyId: string, recipientId: string, orderedIds: string[]): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (!canAddWishFor(viewerOf(user), recipientId)) throw new Error("Vous ne pouvez pas ranger cette liste.");
    await requireMember(user.id, familyId);
    await applyOrder(familyId, recipientId, orderedIds);
    return done();
  } catch (e) {
    return fail(e);
  }
}

/** Déplace un souhait vers une autre famille, avec ses réservations et commentaires. */
export async function moveWish(giftId: string, toFamilyId: string, orderedIds?: string[]): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const gift = await editableWish(user, giftId);
    if (gift.familyId === toFamilyId) return { ok: true };
    await requireMember(user.id, toFamilyId);
    if (!(await getMembership(gift.recipientId, toFamilyId))) throw new Error("La personne n'est pas dans cette famille.");
    const [target, recipient] = await Promise.all([
      db.family.findUniqueOrThrow({ where: { id: toFamilyId } }),
      db.user.findUniqueOrThrow({ where: { id: gift.recipientId } }),
    ]);
    const last = await db.gift.aggregate({
      where: { familyId: toFamilyId, recipientId: gift.recipientId, archivedAt: null, deletedAt: null },
      _max: { position: true },
    });
    // Les participants qui ne sont pas dans la famille d'arrivée ne pourraient plus voir
    // le souhait : leur participation est libérée. Les autres la gardent.
    const others = gift.participants.map((p) => p.userId).filter((id) => id !== user.id);
    const stillMembers = new Set(
      (await db.membership.findMany({ where: { familyId: toFamilyId, userId: { in: others } }, select: { userId: true } })).map(
        (m) => m.userId,
      ),
    );
    const dropped = gift.participants.map((p) => p.userId).filter((id) => id !== user.id && !stillMembers.has(id));
    await db.$transaction(async (tx) => {
      await tx.gift.update({
        where: { id: giftId },
        data: { familyId: toFamilyId, position: (last._max.position ?? -1) + 1 },
      });
      if (dropped.length) {
        await tx.giftParticipant.deleteMany({ where: { giftId, userId: { in: dropped } } });
        const left = await tx.giftParticipant.count({ where: { giftId } });
        if (left === 0) await tx.gift.update({ where: { id: giftId }, data: { takeMode: "AUCUN" } });
      }
    });
    if (orderedIds) await applyOrder(toFamilyId, gift.recipientId, orderedIds);
    const who = displayName(recipient);
    await notify(
      [...stillMembers],
      `${who} a déplacé « ${gift.title} » vers la famille ${target.name}. Votre réservation suit le souhait.`,
      `/f/${target.slug}?cadeau=${gift.id}`,
    );
    await notify(
      dropped,
      `${who} a retiré « ${gift.title} » de sa liste dans votre famille. Votre réservation a été annulée.`,
    );
    return done();
  } catch (e) {
    return fail(e);
  }
}

/** Copie un souhait dans une autre famille : nouveau souhait, sans réservation ni commentaire. */
export async function copyWish(giftId: string, toFamilyId: string, orderedIds?: string[]): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const gift = await editableWish(user, giftId);
    await requireMember(user.id, toFamilyId);
    if (!(await getMembership(gift.recipientId, toFamilyId))) throw new Error("La personne n'est pas dans cette famille.");
    const last = await db.gift.aggregate({
      where: { familyId: toFamilyId, recipientId: gift.recipientId, archivedAt: null, deletedAt: null },
      _max: { position: true },
    });
    const copy = await db.gift.create({
      data: {
        familyId: toFamilyId,
        recipientId: gift.recipientId,
        createdById: user.id,
        kind: "SOUHAIT",
        title: gift.title,
        description: gift.description,
        url: gift.url,
        price: gift.price,
        imageUrl: gift.imageUrl,
        siteOrigin: gift.siteOrigin,
        favorite: gift.favorite,
        position: (last._max.position ?? -1) + 1,
      },
    });
    if (orderedIds) {
      await applyOrder(
        toFamilyId,
        gift.recipientId,
        orderedIds.map((id) => (id === giftId ? copy.id : id)),
      );
    }
    return done();
  } catch (e) {
    return fail(e);
  }
}

export async function markNotificationsRead(): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await db.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
    return done();
  } catch (e) {
    return fail(e);
  }
}

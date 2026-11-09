import "server-only";
import { notFound } from "next/navigation";
import { db } from "./db";
import type { CurrentUser } from "./auth";
import { giftsVisibleTo, type Viewer } from "./visibility";

export const personSelect = { id: true, firstName: true, lastName: true, avatarColor: true } as const;

export const giftInclude = {
  createdBy: { select: personSelect },
  participants: { include: { user: { select: personSelect } } },
  comments: { include: { author: { select: personSelect } } },
} as const;

export function viewerOf(user: CurrentUser): Viewer {
  return { id: user.id, managedIds: user.managedIds };
}

export async function getMembership(userId: string, familyId: string) {
  return db.membership.findUnique({ where: { userId_familyId: { userId, familyId } } });
}

/** Vérifie que l'utilisateur est membre ; sinon 404 (on ne révèle pas l'existence de la famille). */
export async function requireMember(userId: string, familyId: string) {
  const m = await getMembership(userId, familyId);
  if (!m) notFound();
  return m;
}

export async function requireAdmin(userId: string, familyId: string) {
  const m = await requireMember(userId, familyId);
  if (m.role !== "ADMIN") throw new Error("Réservé aux admins de la famille.");
  return m;
}

/** Unique point d'entrée pour lire les cadeaux d'une famille. */
export async function loadVisibleGifts(user: CurrentUser, familyId: string, recipientIds?: string[]) {
  const raw = await db.gift.findMany({
    where: { familyId, archivedAt: null, ...(recipientIds ? { recipientId: { in: recipientIds } } : {}) },
    include: giftInclude,
  });
  return giftsVisibleTo(viewerOf(user), raw);
}

/** Charge un cadeau pour une action d'écriture et vérifie l'appartenance à la famille. */
export async function loadGiftForAction(user: CurrentUser, giftId: string) {
  const gift = await db.gift.findUnique({ where: { id: giftId }, include: { participants: true } });
  if (!gift || gift.archivedAt) throw new Error("Ce cadeau n'existe plus.");
  await requireMember(user.id, gift.familyId);
  return gift;
}

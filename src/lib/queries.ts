import "server-only";
import { notFound } from "next/navigation";
import { db } from "./db";
import { isVerified } from "./auth";
import type { CurrentUser } from "./auth";
import { giftsVisibleTo, type Viewer } from "./visibility";

export const personSelect = { id: true, firstName: true, lastName: true, avatarColor: true, avatar: true, avatarBg: true } as const;

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
/** Pseudos d'une famille : idUtilisateur → nom affiché dans cette famille. */
export async function familyNicknames(familyId: string) {
  const rows = await db.membership.findMany({ where: { familyId, nickname: { not: null } }, select: { userId: true, nickname: true } });
  return new Map(rows.map((r) => [r.userId, r.nickname!]));
}

/** Remplace le prénom par le pseudo de la famille (et retire le nom, pour des initiales cohérentes). */
export function withNickname<T extends { id: string; firstName: string; lastName: string | null }>(p: T, names: Map<string, string>): T {
  const n = names.get(p.id);
  return n ? { ...p, firstName: n, lastName: null } : p;
}

export async function loadVisibleGifts(user: CurrentUser, familyId: string, recipientIds?: string[], since?: Date | null) {
  const [raw, names] = await Promise.all([
    db.gift.findMany({
      where: { familyId, archivedAt: null, deletedAt: null, ...(recipientIds ? { recipientId: { in: recipientIds } } : {}) },
      include: giftInclude,
    }),
    familyNicknames(familyId),
  ]);
  const named = names.size
    ? raw.map((g) => ({
        ...g,
        createdBy: withNickname(g.createdBy, names),
        participants: g.participants.map((p) => ({ ...p, user: withNickname(p.user, names) })),
        comments: g.comments.map((c) => ({ ...c, author: withNickname(c.author, names) })),
      }))
    : raw;
  return giftsVisibleTo(viewerOf(user), named, since);
}

/** Charge un cadeau pour une action d'écriture et vérifie l'appartenance à la famille. */
export async function loadGiftForAction(user: CurrentUser, giftId: string) {
  const gift = await db.gift.findUnique({ where: { id: giftId }, include: { participants: true } });
  if (!gift || gift.archivedAt || gift.deletedAt) throw new Error("Ce cadeau n'existe plus.");
  await requireMember(user.id, gift.familyId);
  return gift;
}

/**
 * Membres qu'un visiteur arrivant par le lien peut reprendre d'un clic (« C'est moi ») :
 * tous ceux qui n'ont pas de vrai compte HotteList (adresse confirmée), sauf les comptes gérés.
 */
export async function claimableMembers(familyId: string) {
  const rows = await db.membership.findMany({
    where: { familyId, user: { managedById: null } },
    include: { user: { select: { id: true, firstName: true, lastName: true, avatarColor: true, avatar: true, avatarBg: true, guest: true, managedById: true, emailVerifiedAt: true, passwordHash: true } } },
    orderBy: { joinedAt: "asc" },
  });
  return rows
    .filter((m) => !isVerified(m.user))
    .map((m) => ({
      id: m.user.id,
      firstName: m.nickname ?? m.user.firstName,
      lastName: m.nickname ? null : m.user.lastName,
      avatarColor: m.user.avatarColor,
      avatar: m.user.avatar,
      avatarBg: m.user.avatarBg,
    }));
}

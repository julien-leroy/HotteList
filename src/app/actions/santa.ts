"use server";

import { revalidatePath } from "next/cache";
import { randomInt } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { requireAdmin } from "@/lib/queries";
import type { ActionResult } from "./family";

/** Mélange de Fisher-Yates avec un aléa cryptographique. */
function shuffle<T>(list: T[]) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Tirage au sort « qui offre à qui ». Un seul grand cercle : chacun offre au suivant,
 * donc personne ne se tire lui-même. Personne, pas même l'admin, ne voit les autres paires.
 */
export async function drawSecretSanta(familyId: string, participantIds: string[], budget: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await requireAdmin(user.id, familyId);
    const ids = [...new Set(participantIds)];
    if (ids.length < 3) throw new Error("Il faut au moins 3 participants pour garder la surprise.");
    const members = await db.membership.findMany({
      where: { familyId, userId: { in: ids }, user: { managedById: null } },
      select: { userId: true },
    });
    if (members.length !== ids.length) throw new Error("Seuls les membres qui ont leur propre compte peuvent participer.");
    const order = shuffle(ids);
    const family = await db.family.findUniqueOrThrow({ where: { id: familyId } });
    await db.$transaction(async (tx) => {
      await tx.secretSanta.deleteMany({ where: { familyId } });
      await tx.family.update({ where: { id: familyId }, data: { santaMode: true } });
      await tx.secretSanta.create({
        data: {
          familyId,
          createdById: user.id,
          budget: z.string().trim().max(40).parse(budget) || null,
          assignments: { create: order.map((giverId, i) => ({ giverId, receiverId: order[(i + 1) % order.length] })) },
        },
      });
      await tx.notification.createMany({
        data: ids.map((userId) => ({
          userId,
          text: `Secret Santa dans ${family.name} : découvrez à qui vous offrez un cadeau !`,
          link: `/f/${family.slug}`,
        })),
      });
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Une erreur est survenue." };
  }
}

/** Active ou coupe le mode Secret Santa. Le couper annule aussi le tirage en cours. */
export async function setSantaMode(familyId: string, on: boolean): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await requireAdmin(user.id, familyId);
    await db.$transaction(async (tx) => {
      await tx.family.update({ where: { id: familyId }, data: { santaMode: on } });
      if (!on) await tx.secretSanta.deleteMany({ where: { familyId } });
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Une erreur est survenue." };
  }
}

export async function cancelSecretSanta(familyId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await requireAdmin(user.id, familyId);
    await db.secretSanta.deleteMany({ where: { familyId } });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Une erreur est survenue." };
  }
}

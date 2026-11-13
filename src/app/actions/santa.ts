"use server";

import { revalidatePath } from "next/cache";
import { randomInt } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { requireAdmin } from "@/lib/queries";
import { mailEnabled, sendSantaEmail } from "@/lib/mail";
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

type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Une erreur est survenue.");

/**
 * Tirage « qui offre à qui » avec **tous les membres qui ont leur compte** (les comptes gérés n'en
 * font pas partie : ils ne peuvent pas se connecter pour découvrir leur tirage).
 * Un seul grand cercle : chacun offre au suivant, donc personne ne se tire lui-même.
 * Personne, pas même l'admin, ne voit les autres paires. Chacun devra cliquer sur « Découvrir ».
 */
async function draw(tx: Tx, familyId: string, adminId: string, budget: string | null) {
  const family = await tx.family.findUniqueOrThrow({ where: { id: familyId } });
  const members = await tx.membership.findMany({ where: { familyId, user: { managedById: null } }, select: { userId: true } });
  const ids = members.map((m) => m.userId);
  if (ids.length < 3) throw new Error("Il faut au moins 3 membres dans la famille pour garder la surprise.");
  const order = shuffle(ids);
  const again = (await tx.secretSanta.count({ where: { familyId } })) > 0;
  await tx.secretSanta.deleteMany({ where: { familyId } });
  await tx.family.update({ where: { id: familyId }, data: { santaMode: true } });
  await tx.secretSanta.create({
    data: {
      familyId,
      createdById: adminId,
      budget,
      assignments: { create: order.map((giverId, i) => ({ giverId, receiverId: order[(i + 1) % order.length] })) },
    },
  });
  await tx.notification.createMany({
    data: ids.map((userId) => ({
      userId,
      text: `Secret Santa dans ${family.name} : cliquez sur « Découvrir » pour savoir à qui vous offrez un cadeau !`,
      link: `/f/${family.slug}`,
    })),
  });
  return { familyId, ids, again, budget, family };
}

/**
 * E-mail « découvrez votre chanceux » à chaque participant qui a une adresse confirmée et garde
 * les e-mails de rappel. Le nom n'y figure pas : la surprise se découvre sur le site.
 */
async function mailParticipants(d: Awaited<ReturnType<typeof draw>>) {
  if (!mailEnabled()) return;
  const base = (process.env.APP_URL ?? "").replace(/\/$/, "");
  const people = await db.user.findMany({
    where: { id: { in: d.ids }, emailVerifiedAt: { not: null }, emailReminders: true, managedById: null },
    select: { firstName: true, email: true },
  });
  await Promise.all(
    people.map((p) =>
      sendSantaEmail(p.email!, {
        firstName: p.firstName,
        familyName: d.family.name,
        eventName: d.family.eventName,
        count: d.ids.length,
        budget: d.budget,
        again: d.again,
        familyUrl: `${base}/f/${d.family.slug}`,
        settingsUrl: `${base}/profil#compte`,
      }).catch((e) => console.error("[mail] secret santa", e)),
    ),
  );
}

const budgetSchema = z.string().trim().max(40, "Budget trop long.");

/** Lance (ou relance) le tirage avec tous les membres. Tout le monde redécouvre le sien. */
export async function drawSecretSanta(familyId: string, budget?: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await requireAdmin(user.id, familyId);
    const current = await db.secretSanta.findFirst({ where: { familyId } });
    const b = budget === undefined ? (current?.budget ?? null) : budgetSchema.parse(budget) || null;
    const d = await db.$transaction((tx) => draw(tx, familyId, user.id, b));
    await mailParticipants(d);
    revalidatePath("/", "layout");
    return { ok: true, message: `Tirage fait entre ${d.ids.length} personnes : chacun va découvrir le sien.` };
  } catch (e) {
    return { ok: false, error: e instanceof z.ZodError ? e.issues[0].message : errMsg(e) };
  }
}

/**
 * Active ou coupe le mode Secret Santa. L'activer lance le tirage tout de suite s'il y a au moins
 * 3 membres (sinon il se lancera depuis l'encart dès qu'ils seront là). Le couper annule le tirage.
 */
export async function setSantaMode(familyId: string, on: boolean): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await requireAdmin(user.id, familyId);
    let message = on ? "Secret Santa activé." : "Secret Santa coupé.";
    let drawn: Awaited<ReturnType<typeof draw>> | null = null;
    await db.$transaction(async (tx) => {
      await tx.family.update({ where: { id: familyId }, data: { santaMode: on } });
      if (!on) {
        await tx.secretSanta.deleteMany({ where: { familyId } });
        return;
      }
      const n = await tx.membership.count({ where: { familyId, user: { managedById: null } } });
      if (n >= 3) {
        drawn = await draw(tx, familyId, user.id, null);
        message = `Secret Santa lancé entre ${n} personnes : chacun va découvrir le sien.`;
      } else {
        message = "Secret Santa activé. Le tirage pourra se faire dès qu'il y aura 3 membres.";
      }
    });
    if (drawn) await mailParticipants(drawn);
    revalidatePath("/", "layout");
    return { ok: true, message };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

/** Change le budget conseillé sans refaire le tirage. */
export async function setSantaBudget(familyId: string, budget: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await requireAdmin(user.id, familyId);
    await db.secretSanta.updateMany({ where: { familyId }, data: { budget: budgetSchema.parse(budget) || null } });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof z.ZodError ? e.issues[0].message : errMsg(e) };
  }
}

export type SantaReveal = { ok: true; receiver: { id: string; firstName: string; lastName: string | null; avatarColor: string } } | { ok: false; error: string };

/** « Découvrir » : renvoie la personne tirée et retient que je l'ai découverte. */
export async function revealSecretSanta(familyId: string): Promise<SantaReveal> {
  try {
    const user = await requireUser();
    const santa = await db.secretSanta.findFirst({ where: { familyId } });
    if (!santa) throw new Error("Le tirage a été annulé.");
    const a = await db.secretSantaAssignment.findUnique({
      where: { santaId_giverId: { santaId: santa.id, giverId: user.id } },
      include: { receiver: true },
    });
    if (!a) throw new Error("Vous ne faites pas partie de ce tirage.");
    if (!a.revealedAt) {
      await db.secretSantaAssignment.update({ where: { santaId_giverId: { santaId: santa.id, giverId: user.id } }, data: { revealedAt: new Date() } });
    }
    const m = await db.membership.findUnique({ where: { userId_familyId: { userId: a.receiverId, familyId } } });
    return {
      ok: true,
      receiver: {
        id: a.receiver.id,
        firstName: m?.nickname || a.receiver.firstName,
        lastName: m?.nickname ? null : a.receiver.lastName,
        avatarColor: a.receiver.avatarColor,
      },
    };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
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
    return { ok: false, error: errMsg(e) };
  }
}

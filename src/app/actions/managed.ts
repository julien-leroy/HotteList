"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, normalizeLogin, requireUser } from "@/lib/auth";
import { AVATAR_COLORS } from "@/lib/utils";
import type { ActionResult } from "./family";

const colorSchema = z.enum(AVATAR_COLORS.map((c) => c.c) as [string, ...string[]]);

function fail(e: unknown): ActionResult {
  if (e instanceof z.ZodError) return { ok: false, error: e.issues[0].message };
  return { ok: false, error: e instanceof Error ? e.message : "Une erreur est survenue." };
}

export async function createManaged(firstName: string, color: string, familyIds: string[]): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const name = z.string().trim().min(1, "Indiquez un prénom.").max(40).parse(firstName);
    const avatarColor = colorSchema.parse(color);
    const mine = await db.membership.findMany({ where: { userId: user.id, familyId: { in: familyIds } } });
    const created = await db.user.create({
      data: {
        firstName: name,
        avatarColor,
        managedById: user.id,
        memberships: { create: mine.map((m) => ({ familyId: m.familyId })) },
      },
    });
    revalidatePath("/", "layout");
    return { ok: true, message: created.id };
  } catch (e) {
    return fail(e);
  }
}

export async function updateManaged(id: string, firstName: string, color: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (!user.managedIds.includes(id)) throw new Error("Ce compte n'est pas géré par vous.");
    await db.user.update({
      where: { id },
      data: {
        firstName: z.string().trim().min(1, "Indiquez un prénom.").max(40).parse(firstName),
        avatarColor: colorSchema.parse(color),
      },
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteManaged(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (!user.managedIds.includes(id)) throw new Error("Ce compte n'est pas géré par vous.");
    await db.user.delete({ where: { id } });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** « Lui donner un accès » : le compte géré devient un compte autonome avec identifiant et mot de passe. */
export async function giveAccess(id: string, login: string, password: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (!user.managedIds.includes(id)) throw new Error("Ce compte n'est pas géré par vous.");
    const l = normalizeLogin(z.string().min(3, "Identifiant trop court.").max(80).parse(login));
    if (/\s/.test(l)) throw new Error("L'identifiant ne doit pas contenir d'espace.");
    if (password.length < 8) throw new Error("Le mot de passe doit faire au moins 8 caractères.");
    if (await db.user.findUnique({ where: { login: l } })) throw new Error("Cet identifiant est déjà pris.");
    await db.user.update({
      where: { id },
      data: { login: l, passwordHash: await hashPassword(password), managedById: null },
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

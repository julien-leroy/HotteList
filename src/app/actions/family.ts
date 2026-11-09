"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, tokenDigest } from "@/lib/auth";
import { requireAdmin, requireMember } from "@/lib/queries";
import { defaultEventDate, randomToken, slugify } from "@/lib/utils";
import type { FormState } from "./auth";

export type ActionResult = { ok: true; url?: string; message?: string } | { ok: false; error: string };

function fail(e: unknown): ActionResult {
  return { ok: false, error: e instanceof Error ? e.message : "Une erreur est survenue." };
}

const nameSchema = z.string().trim().min(2, "Donnez un nom à la famille.").max(60);

export async function createFamily(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = nameSchema.safeParse(formData.get("name"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const family = await db.family.create({
    data: {
      name: parsed.data,
      slug: slugify(parsed.data),
      createdById: user.id,
      eventDate: defaultEventDate(),
      memberships: { create: { userId: user.id, role: "ADMIN" } },
    },
  });
  redirect(`/f/${family.slug}`);
}

export async function joinFamily(familyId: string, managedIds: string[] = []) {
  const user = await requireUser();
  const family = await db.family.findUniqueOrThrow({ where: { id: familyId } });
  const ids = [user.id, ...managedIds.filter((id) => user.managedIds.includes(id))];
  for (const userId of ids) {
    await db.membership.upsert({
      where: { userId_familyId: { userId, familyId } },
      create: { userId, familyId, role: "MEMBRE" },
      update: {},
    });
  }
  redirect(`/f/${family.slug}`);
}

export async function leaveFamily(familyId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const m = await requireMember(user.id, familyId);
    if (m.role === "ADMIN") {
      const admins = await db.membership.count({ where: { familyId, role: "ADMIN" } });
      const members = await db.membership.count({ where: { familyId, user: { managedById: null } } });
      if (admins <= 1 && members > 1) throw new Error("Nommez un autre admin avant de quitter la famille.");
    }
    await db.membership.deleteMany({ where: { familyId, userId: { in: [user.id, ...user.managedIds] } } });
  } catch (e) {
    return fail(e);
  }
  redirect("/familles");
}

/** Ajoute ou retire un compte géré d'une famille dont je suis membre. */
export async function setManagedInFamily(familyId: string, managedId: string, inFamily: boolean): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (!user.managedIds.includes(managedId)) throw new Error("Ce compte n'est pas géré par vous.");
    await requireMember(user.id, familyId);
    if (inFamily) {
      await db.membership.upsert({
        where: { userId_familyId: { userId: managedId, familyId } },
        create: { userId: managedId, familyId },
        update: {},
      });
    } else {
      await db.membership.deleteMany({ where: { userId: managedId, familyId } });
    }
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ---------- Admin ----------

export async function renameFamily(familyId: string, name: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await requireAdmin(user.id, familyId);
    const parsed = nameSchema.parse(name);
    await db.family.update({ where: { id: familyId }, data: { name: parsed } });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function setEventDate(familyId: string, isoDate: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await requireAdmin(user.id, familyId);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) throw new Error("Date invalide.");
    await db.family.update({ where: { id: familyId }, data: { eventDate: new Date(`${isoDate}T12:00:00Z`) } });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function regenerateLink(familyId: string): Promise<ActionResult> {
  let slug = "";
  try {
    const user = await requireUser();
    await requireAdmin(user.id, familyId);
    const family = await db.family.findUniqueOrThrow({ where: { id: familyId } });
    slug = slugify(family.name);
    await db.family.update({ where: { id: familyId }, data: { slug } });
  } catch (e) {
    return fail(e);
  }
  redirect(`/f/${slug}`);
}

export async function setMemberRole(familyId: string, userId: string, role: "ADMIN" | "MEMBRE"): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await requireAdmin(user.id, familyId);
    const target = await db.user.findUniqueOrThrow({ where: { id: userId } });
    if (target.managedById) throw new Error("Un compte géré ne peut pas être admin.");
    if (role === "MEMBRE") {
      const admins = await db.membership.count({ where: { familyId, role: "ADMIN" } });
      if (admins <= 1) throw new Error("La famille doit garder au moins un admin.");
    }
    await db.membership.update({ where: { userId_familyId: { userId, familyId } }, data: { role } });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function removeMember(familyId: string, userId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await requireAdmin(user.id, familyId);
    if (userId === user.id) throw new Error("Utilisez « Quitter la famille ».");
    const managed = await db.user.findMany({ where: { managedById: userId }, select: { id: true } });
    await db.membership.deleteMany({ where: { familyId, userId: { in: [userId, ...managed.map((m) => m.id)] } } });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Lien de réinitialisation à usage unique, valable 24 h, à envoyer soi-même par SMS. */
export async function createResetLink(familyId: string, userId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await requireAdmin(user.id, familyId);
    await requireMember(userId, familyId);
    const target = await db.user.findUniqueOrThrow({ where: { id: userId } });
    if (target.managedById || !target.login) throw new Error("Ce compte n'a pas de mot de passe.");
    const token = randomToken();
    await db.passwordResetToken.create({
      data: { id: tokenDigest(token), userId, expiresAt: new Date(Date.now() + 24 * 3600_000) },
    });
    const base = process.env.APP_URL ?? "";
    return { ok: true, url: `${base}/reinitialiser/${token}` };
  } catch (e) {
    return fail(e);
  }
}

/** Fin de l'événement : archive les cadeaux réservés ou à plusieurs. */
export async function cleanLists(familyId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await requireAdmin(user.id, familyId);
    const family = await db.family.findUniqueOrThrow({ where: { id: familyId } });
    const year = Number(new Intl.DateTimeFormat("fr-FR", { year: "numeric", timeZone: "Europe/Paris" }).format(family.eventDate));
    const res = await db.gift.updateMany({
      where: { familyId, archivedAt: null, takeMode: { in: ["SEUL", "A_PLUSIEURS"] } },
      data: { archivedAt: new Date(), archiveYear: year },
    });
    revalidatePath("/", "layout");
    return { ok: true, message: `${res.count} cadeau${res.count > 1 ? "x" : ""} archivé${res.count > 1 ? "s" : ""}.` };
  } catch (e) {
    return fail(e);
  }
}

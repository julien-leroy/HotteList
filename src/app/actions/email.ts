"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, hashPassword, requireUser, safeNext, verifyPassword } from "@/lib/auth";
import { clientIp, hit } from "@/lib/rate-limit";
import { mailEnabled } from "@/lib/mail";
import { consumeCode, issueCode, looksLikeEmail, normalizeEmail } from "@/lib/email-codes";
import type { ActionResult } from "./family";

function fail(e: unknown): ActionResult {
  if (e instanceof z.ZodError) return { ok: false, error: e.issues[0].message };
  return { ok: false, error: e instanceof Error ? e.message : "Une erreur est survenue." };
}

const SEND_FAILED = "L'e-mail n'a pas pu partir. Réessayez dans un instant.";

function ensureMail() {
  if (!mailEnabled()) throw new Error("L'envoi d'e-mails n'est pas configuré sur ce site.");
}

// ---------- Mon adresse e-mail (connecté) ----------

/** Envoie un code de confirmation à l'adresse ; elle n'est enregistrée qu'une fois confirmée. */
export async function requestEmailVerification(rawEmail: string): Promise<ActionResult> {
  try {
    ensureMail();
    const user = await requireUser();
    const email = normalizeEmail(rawEmail);
    if (!looksLikeEmail(email)) throw new Error("Cette adresse e-mail ne semble pas valide.");
    const taken = await db.user.findFirst({ where: { email, emailVerifiedAt: { not: null }, NOT: { id: user.id } } });
    if (taken) throw new Error("Cette adresse est déjà reliée à un autre compte.");
    if (!hit(`mail:verify:${user.id}`, 5, 60 * 60_000)) throw new Error("Trop de codes demandés. Réessayez dans une heure.");
    try {
      await issueCode(user, email, "VERIFY");
    } catch (e) {
      console.error("[mail] envoi impossible", e);
      throw new Error(SEND_FAILED);
    }
    return { ok: true, message: email };
  } catch (e) {
    return fail(e);
  }
}

export async function confirmEmail(code: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const pending = await db.emailCode.findFirst({
      where: { userId: user.id, purpose: "VERIFY", usedAt: null },
      orderBy: { createdAt: "desc" },
    });
    if (!pending) throw new Error("Aucun code en attente. Renvoyez-en un.");
    const check = await consumeCode(pending.email, "VERIFY", code, user.id);
    if (!check.ok) throw new Error(check.error);
    const taken = await db.user.findFirst({ where: { email: check.email, NOT: { id: user.id } } });
    if (taken?.emailVerifiedAt) throw new Error("Cette adresse est déjà reliée à un autre compte.");
    await db.$transaction([
      // une adresse jamais confirmée par quelqu'un d'autre ne bloque pas le vrai propriétaire
      ...(taken ? [db.user.update({ where: { id: taken.id }, data: { email: null, emailVerifiedAt: null } })] : []),
      db.user.update({ where: { id: user.id }, data: { email: check.email, emailVerifiedAt: new Date() } }),
    ]);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function removeEmail(): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await db.user.update({ where: { id: user.id }, data: { email: null, emailVerifiedAt: null } });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ---------- Mon compte ----------

export async function setEmailReminders(on: boolean): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await db.user.update({ where: { id: user.id }, data: { emailReminders: on } });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function updateMyName(firstName: string, lastName: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await db.user.update({
      where: { id: user.id },
      data: {
        firstName: z.string().trim().min(1, "Indiquez votre prénom.").max(40).parse(firstName),
        lastName: z.string().trim().max(40).parse(lastName) || null,
      },
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function changePassword(current: string, next: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const ip = await clientIp();
    if (!hit(`pwchange:${ip}:${user.id}`, 8, 15 * 60_000)) throw new Error("Trop de tentatives. Patientez quelques minutes.");
    const row = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    if (!(await verifyPassword(current, row.passwordHash))) throw new Error("Le mot de passe actuel est incorrect.");
    if (next.length < 8) throw new Error("Le nouveau mot de passe doit faire au moins 8 caractères.");
    await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ---------- Sans être connecté : code de connexion, mot de passe oublié ----------

/**
 * Envoie un code si l'adresse correspond à un compte confirmé.
 * La réponse est toujours la même, pour ne pas révéler quelles adresses ont un compte.
 */
export async function requestPublicCode(purpose: "LOGIN" | "RESET", rawEmail: string): Promise<ActionResult> {
  try {
    ensureMail();
    const email = normalizeEmail(rawEmail);
    if (!looksLikeEmail(email)) throw new Error("Cette adresse e-mail ne semble pas valide.");
    const ip = await clientIp();
    if (!hit(`mail:ip:${ip}`, 10, 60 * 60_000) || !hit(`mail:${purpose}:${email}`, 3, 15 * 60_000)) {
      throw new Error("Trop de codes demandés. Patientez un peu avant de réessayer.");
    }
    const user = await db.user.findFirst({ where: { email, emailVerifiedAt: { not: null }, managedById: null } });
    if (user) {
      try {
        await issueCode(user, email, purpose);
      } catch (e) {
        console.error("[mail] envoi impossible", e);
        throw new Error(SEND_FAILED);
      }
    }
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

async function guardCodeAttempt(email: string) {
  const ip = await clientIp();
  if (!hit(`code:ip:${ip}`, 30, 15 * 60_000)) throw new Error("Trop de tentatives. Patientez quelques minutes.");
  return normalizeEmail(email);
}

export async function loginWithCode(rawEmail: string, code: string, next?: string): Promise<ActionResult> {
  let target = "/familles";
  try {
    const email = await guardCodeAttempt(rawEmail);
    const check = await consumeCode(email, "LOGIN", code);
    if (!check.ok) throw new Error(check.error);
    await createSession(check.userId);
    target = safeNext(next) ?? "/familles";
  } catch (e) {
    return fail(e);
  }
  redirect(target);
}

export async function resetWithCode(rawEmail: string, code: string, password: string): Promise<ActionResult> {
  try {
    const email = await guardCodeAttempt(rawEmail);
    if (password.length < 8) throw new Error("Le mot de passe doit faire au moins 8 caractères.");
    const check = await consumeCode(email, "RESET", code);
    if (!check.ok) throw new Error(check.error);
    await db.$transaction([
      db.user.update({ where: { id: check.userId }, data: { passwordHash: await hashPassword(password) } }),
      db.session.deleteMany({ where: { userId: check.userId } }),
    ]);
    await createSession(check.userId);
  } catch (e) {
    return fail(e);
  }
  redirect("/familles");
}

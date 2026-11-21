"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  createSession,
  destroySession,
  hashPassword,
  normalizeLogin,
  requireUser,
  safeNext,
  verifyPassword,
} from "@/lib/auth";
import { clientIp, hit } from "@/lib/rate-limit";
import { randomColor } from "@/lib/utils";
import { mailEnabled } from "@/lib/mail";
import { consumeCode, issueCode, looksLikeEmail, normalizeEmail } from "@/lib/email-codes";
import type { ActionResult } from "./family";

// Entrer dans une famille depuis son lien, sans créer de compte :
// on donne son prénom (compte « invité »), ou on choisit son nom parmi les membres sans compte.
// L'invité peut ensuite créer son compte (e-mail confirmé + mot de passe) quand il le souhaite.

function fail(e: unknown): ActionResult {
  if (e instanceof z.ZodError) return { ok: false, error: e.issues[0].message };
  return { ok: false, error: e instanceof Error ? e.message : "Une erreur est survenue." };
}

const firstNameSchema = z.string().trim().min(1, "Indiquez votre prénom.").max(40);
const lastNameSchema = z.string().trim().max(40);

/** « Je ne suis pas dans la liste » : crée un compte invité et le fait entrer dans la famille. */
export async function joinAsGuest(familyId: string, firstName: string, lastName = ""): Promise<ActionResult> {
  let slug = "";
  try {
    const ip = await clientIp();
    if (!hit(`guest:${ip}`, 10, 60 * 60_000)) throw new Error("Trop d'arrivées depuis cette connexion. Réessayez plus tard.");
    const family = await db.family.findUnique({ where: { id: familyId } });
    if (!family) throw new Error("Cette famille n'existe plus.");
    const user = await db.user.create({
      data: {
        firstName: firstNameSchema.parse(firstName),
        lastName: lastNameSchema.parse(lastName) || null,
        guest: true,
        avatarColor: randomColor(),
        memberships: { create: { familyId: family.id } },
      },
    });
    await createSession(user.id);
    slug = family.slug;
  } catch (e) {
    return fail(e);
  }
  redirect(`/f/${slug}`);
}

/**
 * « C'est moi » : reprendre un membre de la famille qui n'a pas encore de compte complet.
 * Un invité se reprend d'un clic ; un ancien compte avec mot de passe demande ce mot de passe.
 * Un compte à l'adresse confirmée n'est jamais repris ainsi : il se connecte normalement.
 */
export async function claimMember(familyId: string, userId: string, password?: string): Promise<ActionResult> {
  let slug = "";
  try {
    const ip = await clientIp();
    const m = await db.membership.findUnique({
      where: { userId_familyId: { userId, familyId } },
      include: { user: true, family: { select: { slug: true } } },
    });
    if (!m || m.user.managedById || m.user.emailVerifiedAt) throw new Error("Ce nom ne peut pas être choisi ici. Connectez-vous.");
    if (!m.user.guest) {
      if (!hit(`claim:${ip}`, 20, 15 * 60_000) || !hit(`claim:${ip}:${userId}`, 8, 15 * 60_000)) {
        throw new Error("Trop de tentatives. Patientez quelques minutes.");
      }
      if (!(await verifyPassword(password ?? "", m.user.passwordHash))) throw new Error("Mot de passe incorrect.");
    }
    await createSession(userId);
    slug = m.family.slug;
  } catch (e) {
    return fail(e);
  }
  redirect(`/f/${slug}`);
}

// ---------- Un invité crée son compte ----------

/**
 * Étape 1 : adresse + mot de passe. Avec les e-mails : un code part à l'adresse, rien ne change tant
 * qu'il n'est pas saisi. Sans e-mails sur le site : l'identifiant et le mot de passe sont enregistrés tout de suite.
 */
export async function startAccount(rawId: string, password: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (!user.guest) throw new Error("Vous avez déjà un compte.");
    if (password.length < 8) throw new Error("Le mot de passe doit faire au moins 8 caractères.");
    if (password.length > 200) throw new Error("Mot de passe trop long.");

    if (!mailEnabled()) {
      const login = normalizeLogin(rawId);
      if (login.length < 3 || /\s/.test(login)) throw new Error("L'identifiant doit faire au moins 3 caractères, sans espace.");
      if (await db.user.findUnique({ where: { login } })) throw new Error("Cet identifiant est déjà pris.");
      await db.user.update({ where: { id: user.id }, data: { login, passwordHash: await hashPassword(password), guest: false } });
      revalidatePath("/", "layout");
      return { ok: true, message: "done" };
    }

    const email = normalizeEmail(rawId);
    if (!looksLikeEmail(email)) throw new Error("Cette adresse e-mail ne semble pas valide.");
    if (await db.user.findFirst({ where: { OR: [{ login: email }, { email, emailVerifiedAt: { not: null } }] } })) {
      throw new Error("EXISTS");
    }
    if (!hit(`mail:account:${user.id}`, 5, 60 * 60_000)) throw new Error("Trop de codes demandés. Réessayez dans une heure.");
    try {
      await issueCode(user, email, "ACCOUNT", await hashPassword(password));
    } catch (e) {
      console.error("[mail] code de création de compte", e);
      throw new Error("L'e-mail n'a pas pu partir. Vérifiez l'adresse ou réessayez dans un instant.");
    }
    return { ok: true, message: email };
  } catch (e) {
    return fail(e);
  }
}

/** Étape 2 : le bon code transforme l'invité en compte complet (identifiant = adresse confirmée). */
export async function confirmAccount(code: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (!user.guest) throw new Error("Vous avez déjà un compte.");
    const ip = await clientIp();
    if (!hit(`code:ip:${ip}`, 30, 15 * 60_000)) throw new Error("Trop de tentatives. Patientez quelques minutes.");
    const pending = await db.emailCode.findFirst({
      where: { userId: user.id, purpose: "ACCOUNT", usedAt: null },
      orderBy: { createdAt: "desc" },
    });
    if (!pending) throw new Error("Aucun code en attente. Renvoyez-en un.");
    const check = await consumeCode(pending.email, "ACCOUNT", code, user.id);
    if (!check.ok) throw new Error(check.error);
    if (!check.passwordHash) throw new Error("Recommencez le formulaire.");
    const taken = await db.user.findFirst({
      where: { OR: [{ login: check.email }, { email: check.email }], NOT: { id: user.id } },
    });
    if (taken && (taken.login === check.email || taken.emailVerifiedAt)) throw new Error("Un compte existe déjà avec cette adresse.");
    await db.$transaction([
      // une adresse jamais confirmée par quelqu'un d'autre ne bloque pas le vrai propriétaire
      ...(taken ? [db.user.update({ where: { id: taken.id }, data: { email: null, emailVerifiedAt: null } })] : []),
      db.user.update({
        where: { id: user.id },
        data: { login: check.email, email: check.email, emailVerifiedAt: new Date(), passwordHash: check.passwordHash, guest: false },
      }),
    ]);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function resendAccountCode(): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const pending = await db.emailCode.findFirst({
      where: { userId: user.id, purpose: "ACCOUNT" },
      orderBy: { createdAt: "desc" },
    });
    if (!pending?.passwordHash) throw new Error("Recommencez le formulaire.");
    if (!hit(`mail:account:${user.id}`, 5, 60 * 60_000)) throw new Error("Trop de codes demandés. Réessayez dans une heure.");
    await issueCode(user, pending.email, "ACCOUNT", pending.passwordHash);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** L'invité a déjà un compte ailleurs : on quitte l'invité et on va se connecter. */
export async function switchToLogin(email: string, next?: string) {
  await destroySession();
  const q = new URLSearchParams();
  const n = safeNext(next);
  if (n) q.set("next", n);
  if (email) q.set("email", email);
  redirect(`/?${q.toString()}`);
}

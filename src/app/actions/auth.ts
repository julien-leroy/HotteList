"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  createSession,
  destroySession,
  hashPassword,
  normalizeLogin,
  safeNext,
  tokenDigest,
  verifyPassword,
} from "@/lib/auth";
import { clientIp, hit } from "@/lib/rate-limit";
import { randomColor } from "@/lib/utils";
import { mailEnabled } from "@/lib/mail";
import { consumeCode, issueCode, looksLikeEmail, normalizeEmail } from "@/lib/email-codes";

/**
 * `values` : champs déjà saisis, réaffichés après une erreur (React vide le formulaire après envoi).
 * `step: "code"` : l'inscription attend le code reçu par e-mail. `exists` : un compte existe déjà avec cette adresse.
 */
export type FormState =
  | { error?: string; ok?: string; values?: Record<string, string>; step?: "code"; email?: string; exists?: boolean }
  | undefined;

const signupSchema = z.object({
  firstName: z.string().trim().min(1, "Indiquez votre prénom.").max(40),
  lastName: z.string().trim().max(40).optional(),
  login: z
    .string()
    .trim()
    .min(3, "L'identifiant doit faire au moins 3 caractères.")
    .max(80)
    .regex(/^[^\s]+$/, "L'identifiant ne doit pas contenir d'espace."),
  password: z.string().min(8, "Le mot de passe doit faire au moins 8 caractères.").max(200),
});

const signupEmailSchema = z.object({
  firstName: z.string().trim().min(1, "Indiquez votre prénom.").max(40),
  lastName: z.string().trim().max(40).optional(),
  email: z.string().trim().max(120).refine(looksLikeEmail, "Cette adresse e-mail ne semble pas valide."),
  password: z.string().min(8, "Le mot de passe doit faire au moins 8 caractères.").max(200),
});

/** Un compte actif utilise-t-il déjà cette adresse (comme identifiant ou comme e-mail confirmé) ? */
async function emailTaken(email: string, exceptId?: string) {
  return db.user.findFirst({
    where: {
      OR: [{ login: email }, { email, emailVerifiedAt: { not: null } }],
      ...(exceptId ? { NOT: { id: exceptId } } : {}),
    },
  });
}

export async function signup(_: FormState, formData: FormData): Promise<FormState> {
  const ip = await clientIp();
  if (!hit(`signup:${ip}`, 5, 60 * 60_000)) return { error: "Trop d'inscriptions depuis cette connexion. Réessayez plus tard." };
  if (mailEnabled()) return signupWithEmail(formData);

  const parsed = signupSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName") || undefined,
    login: formData.get("login"),
    password: formData.get("password"),
  });
  const values = {
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    login: String(formData.get("login") ?? ""),
  };
  if (!parsed.success) return { error: parsed.error.issues[0].message, values };

  const login = normalizeLogin(parsed.data.login);
  const exists = await db.user.findUnique({ where: { login } });
  if (exists) return { error: "Cet identifiant est déjà pris.", values };

  const user = await db.user.create({
    data: {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName || null,
      login,
      passwordHash: await hashPassword(parsed.data.password),
      avatarColor: randomColor(),
    },
  });
  // Inscription depuis le lien d'une famille : on la rejoint directement.
  const joinId = formData.get("joinFamilyId");
  if (typeof joinId === "string" && joinId) {
    const family = await db.family.findUnique({ where: { id: joinId } });
    if (family) await db.membership.create({ data: { userId: user.id, familyId: family.id } });
  }
  await createSession(user.id);
  redirect(safeNext(formData.get("next")) ?? "/familles");
}

export async function login(_: FormState, formData: FormData): Promise<FormState> {
  const ip = await clientIp();
  const loginValue = normalizeLogin(String(formData.get("login") ?? ""));
  const password = String(formData.get("password") ?? "");
  if (!hit(`login:${ip}`, 20, 15 * 60_000) || !hit(`login:${ip}:${loginValue}`, 8, 15 * 60_000)) {
    return { error: "Trop de tentatives. Patientez quelques minutes.", values: { login: String(formData.get("login") ?? "") } };
  }
  // L'identifiant, ou l'adresse e-mail une fois confirmée
  const user =
    (await db.user.findUnique({ where: { login: loginValue } })) ??
    (await db.user.findFirst({ where: { email: loginValue, emailVerifiedAt: { not: null } } }));
  const ok = user && !user.managedById && (await verifyPassword(password, user.passwordHash));
  if (!ok || !user) return { error: "Identifiant ou mot de passe incorrect.", values: { login: String(formData.get("login") ?? "") } };
  await createSession(user.id);
  redirect(safeNext(formData.get("next")) ?? "/familles");
}

export async function logout() {
  await destroySession();
  redirect("/");
}

export async function resetPasswordWithToken(_: FormState, formData: FormData): Promise<FormState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "Le mot de passe doit faire au moins 8 caractères." };
  if (password !== formData.get("confirm")) return { error: "Les deux mots de passe ne correspondent pas." };

  const record = await db.passwordResetToken.findUnique({ where: { id: tokenDigest(token) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { error: "Ce lien n'est plus valable. Demandez-en un nouveau à l'admin de votre famille." };
  }
  await db.$transaction([
    db.user.update({ where: { id: record.userId }, data: { passwordHash: await hashPassword(password) } }),
    db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    db.session.deleteMany({ where: { userId: record.userId } }),
  ]);
  await createSession(record.userId);
  redirect("/familles");
}

// ---------- Inscription avec validation de l'adresse e-mail ----------

/**
 * Étape 1 : vérifie les champs et envoie un code. Le compte reste « en attente » (sans identifiant,
 * donc impossible de s'y connecter) tant que le code n'est pas saisi.
 */
async function signupWithEmail(formData: FormData): Promise<FormState> {
  const values = {
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    email: String(formData.get("email") ?? ""),
  };
  const parsed = signupEmailSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName") || undefined,
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message, values };
  const email = normalizeEmail(parsed.data.email);
  if (await emailTaken(email)) {
    return { error: "Un compte existe déjà avec cette adresse.", values, exists: true, email };
  }
  if (!hit(`signup-code:${email}`, 4, 15 * 60_000)) return { error: "Trop de codes demandés pour cette adresse. Patientez un peu.", values };

  // Une inscription déjà en attente pour cette adresse est réutilisée (pas de doublon).
  const previous = await db.emailCode.findFirst({
    where: { email, purpose: "SIGNUP", user: { login: null, managedById: null } },
    orderBy: { createdAt: "desc" },
  });
  const data = {
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName || null,
    passwordHash: await hashPassword(parsed.data.password),
  };
  const user = previous
    ? await db.user.update({ where: { id: previous.userId }, data })
    : await db.user.create({ data: { ...data, avatarColor: randomColor() } });
  try {
    await issueCode(user, email, "SIGNUP");
  } catch (e) {
    console.error("[mail] code d'inscription", e);
    return { error: "L'e-mail n'a pas pu partir. Vérifiez l'adresse ou réessayez dans un instant.", values };
  }
  return { step: "code", email, values };
}

export type CodeResult = { ok: true } | { ok: false; error: string };

/** Étape 2 : le bon code active le compte (identifiant = adresse), connecte, et rejoint la famille éventuelle. */
export async function confirmSignup(rawEmail: string, code: string, next?: string, joinFamilyId?: string): Promise<CodeResult> {
  let target = "/familles";
  try {
    const ip = await clientIp();
    if (!hit(`code:ip:${ip}`, 30, 15 * 60_000)) throw new Error("Trop de tentatives. Patientez quelques minutes.");
    const email = normalizeEmail(rawEmail);
    const check = await consumeCode(email, "SIGNUP", code);
    if (!check.ok) throw new Error(check.error);
    if (await emailTaken(email, check.userId)) throw new Error("Un compte existe déjà avec cette adresse. Connectez-vous.");
    await db.user.update({
      where: { id: check.userId },
      data: { login: email, email, emailVerifiedAt: new Date() },
    });
    if (joinFamilyId) {
      const family = await db.family.findUnique({ where: { id: joinFamilyId } });
      if (family) {
        await db.membership.upsert({
          where: { userId_familyId: { userId: check.userId, familyId: family.id } },
          create: { userId: check.userId, familyId: family.id },
          update: {},
        });
      }
    }
    await createSession(check.userId);
    target = safeNext(next) ?? "/familles";
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Une erreur est survenue." };
  }
  redirect(target);
}

export async function resendSignupCode(rawEmail: string): Promise<CodeResult> {
  try {
    const email = normalizeEmail(rawEmail);
    if (!hit(`signup-code:${email}`, 4, 15 * 60_000)) throw new Error("Trop de codes demandés. Patientez un peu.");
    const pending = await db.emailCode.findFirst({
      where: { email, purpose: "SIGNUP", user: { login: null } },
      orderBy: { createdAt: "desc" },
      include: { user: true },
    });
    if (!pending) throw new Error("Inscription introuvable. Recommencez le formulaire.");
    await issueCode(pending.user, email, "SIGNUP");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "L'e-mail n'a pas pu partir." };
  }
}

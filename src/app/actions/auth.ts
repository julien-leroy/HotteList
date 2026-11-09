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

/** `values` : champs déjà saisis, réaffichés après une erreur (React vide le formulaire après envoi). */
export type FormState = { error?: string; ok?: string; values?: Record<string, string> } | undefined;

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

export async function signup(_: FormState, formData: FormData): Promise<FormState> {
  const ip = await clientIp();
  if (!hit(`signup:${ip}`, 5, 60 * 60_000)) return { error: "Trop d'inscriptions depuis cette connexion. Réessayez plus tard." };

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

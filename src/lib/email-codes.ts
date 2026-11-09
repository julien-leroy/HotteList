import "server-only";
import { randomInt } from "node:crypto";
import { db } from "./db";
import { tokenDigest } from "./auth";
import { sendCodeEmail, type CodePurpose } from "./mail";

// Codes à 6 chiffres : 10 minutes, 5 essais, un seul code actif par usage.
export const CODE_MINUTES = 10;
const MAX_ATTEMPTS = 5;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function looksLikeEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
}

function digest(email: string, purpose: CodePurpose, code: string) {
  return tokenDigest(`${purpose}:${email}:${code}`);
}

/** Crée un code, invalide les précédents du même usage, et l'envoie. */
export async function issueCode(user: { id: string; firstName: string }, email: string, purpose: CodePurpose) {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.$transaction([
    db.emailCode.updateMany({ where: { userId: user.id, purpose, usedAt: null }, data: { usedAt: new Date() } }),
    db.emailCode.create({
      data: {
        userId: user.id,
        email,
        purpose,
        codeHash: digest(email, purpose, code),
        expiresAt: new Date(Date.now() + CODE_MINUTES * 60_000),
      },
    }),
  ]);
  await sendCodeEmail(email, purpose, user.firstName, code, CODE_MINUTES);
}

export type CodeCheck = { ok: true; userId: string; email: string } | { ok: false; error: string };

/** Vérifie un code ; le consomme s'il est bon, compte l'essai sinon. */
export async function consumeCode(email: string, purpose: CodePurpose, code: string, userId?: string): Promise<CodeCheck> {
  const clean = code.replace(/\D/g, "");
  const record = await db.emailCode.findFirst({
    where: { email, purpose, usedAt: null, ...(userId ? { userId } : {}) },
    orderBy: { createdAt: "desc" },
  });
  if (!record || record.expiresAt < new Date()) {
    return { ok: false, error: "Ce code a expiré. Demandez-en un nouveau." };
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    return { ok: false, error: "Trop d'essais. Demandez un nouveau code." };
  }
  if (clean.length !== 6 || digest(email, purpose, clean) !== record.codeHash) {
    const left = MAX_ATTEMPTS - record.attempts - 1;
    await db.emailCode.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
    return { ok: false, error: left > 0 ? `Code incorrect. Encore ${left} essai${left > 1 ? "s" : ""}.` : "Trop d'essais. Demandez un nouveau code." };
  }
  // Mise à jour conditionnelle : un code ne peut servir qu'une fois, même en double-clic.
  const res = await db.emailCode.updateMany({ where: { id: record.id, usedAt: null }, data: { usedAt: new Date() } });
  if (res.count !== 1) return { ok: false, error: "Ce code a déjà servi." };
  return { ok: true, userId: record.userId, email: record.email };
}

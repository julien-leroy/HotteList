import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { db } from "./db";
import { randomToken } from "./utils";
import { mailEnabled } from "./mail";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number, opts: object) => Promise<Buffer>;

const COOKIE = "hl_session";
const SESSION_DAYS = 60;
/** Compte non vérifié (sans mot de passe) : on le garde un an sur l'appareil, pour retrouver sa place sans rien retaper */
const LONG_SESSION_DAYS = 365;
const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

// ---------- Mots de passe (scrypt, intégré à Node) ----------

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string | null | undefined) {
  if (!stored) return false;
  const [algo, N, r, p, saltB64, hashB64] = stored.split("$");
  if (algo !== "scrypt") return false;
  const expected = Buffer.from(hashB64, "base64");
  const got = await scrypt(password, Buffer.from(saltB64, "base64"), expected.length, {
    N: Number(N),
    r: Number(r),
    p: Number(p),
    maxmem: SCRYPT.maxmem,
  });
  return got.length === expected.length && timingSafeEqual(got, expected);
}

/** Empreinte d'un jeton (session, réinitialisation) : seule l'empreinte est en base. */
export function tokenDigest(token: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 8) throw new Error("AUTH_SECRET manquant dans .env");
  return createHmac("sha256", secret).update(token).digest("hex");
}

// ---------- Sessions ----------

export async function createSession(userId: string, opts: { long?: boolean } = {}) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + (opts.long ? LONG_SESSION_DAYS : SESSION_DAYS) * 86_400_000);
  await db.session.create({ data: { id: tokenDigest(token), userId, expiresAt } });
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: (process.env.APP_URL ?? "").startsWith("https://"),
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { id: tokenDigest(token) } });
  jar.delete(COOKIE);
}

export type CurrentUser = {
  id: string;
  firstName: string;
  lastName: string | null;
  login: string | null;
  avatarColor: string;
  managedIds: string[];
  /** compte invité : juste un prénom, entré depuis le lien d'une famille */
  guest: boolean;
  /** compte complet : adresse e-mail confirmée (ou mot de passe, si le site n'envoie pas d'e-mails).
   *  Seul un compte complet peut créer une famille, en être admin, et accéder à son profil. */
  verified: boolean;
  /** adresse e-mail confirmée : les notifications peuvent partir par e-mail */
  hasEmail: boolean;
};

/** Compte complet : voir `CurrentUser.verified`. */
export function isVerified(u: { guest: boolean; managedById?: string | null; emailVerifiedAt: Date | null; passwordHash: string | null }) {
  if (u.guest || u.managedById) return false;
  return mailEnabled() ? Boolean(u.emailVerifiedAt) : Boolean(u.passwordHash);
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { id: tokenDigest(token) },
    include: { user: { include: { managed: { select: { id: true } } } } },
  });
  if (!session || session.expiresAt < new Date() || session.user.managedById) return null;
  const u = session.user;
  return {
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    login: u.login,
    avatarColor: u.avatarColor,
    managedIds: u.managed.map((m) => m.id),
    guest: u.guest,
    verified: isVerified(u),
    hasEmail: Boolean(u.emailVerifiedAt),
  };
});

export async function requireUser(next?: string) {
  const user = await getCurrentUser();
  if (!user) redirect(next ? `/?next=${encodeURIComponent(next)}` : "/");
  return user;
}

/** Page réservée aux comptes complets : un invité est envoyé vers « Créer mon compte ». */
export async function requireAccount(next: string) {
  const user = await requireUser(next);
  if (!user.verified) redirect(`/creer-mon-compte?next=${encodeURIComponent(next)}`);
  return user;
}

export function normalizeLogin(login: string) {
  return login.trim().toLowerCase();
}

/** N'accepte que les redirections internes (« /f/… »), jamais vers un autre site. */
export function safeNext(next: unknown) {
  if (typeof next !== "string") return null;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  return next;
}

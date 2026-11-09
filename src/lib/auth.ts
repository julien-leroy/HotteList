import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { db } from "./db";
import { randomToken } from "./utils";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number, opts: object) => Promise<Buffer>;

const COOKIE = "hl_session";
const SESSION_DAYS = 60;
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

export async function createSession(userId: string) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
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
};

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
  };
});

export async function requireUser(next?: string) {
  const user = await getCurrentUser();
  if (!user) redirect(next ? `/?next=${encodeURIComponent(next)}` : "/");
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

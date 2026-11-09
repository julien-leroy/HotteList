import { randomBytes, createHash } from "node:crypto";

export { AVATAR_COLORS } from "./colors";
import { AVATAR_COLORS } from "./colors";

export function randomColor() {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)].c;
}

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

const SLUG_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

export function randomSuffix(len = 4) {
  const buf = randomBytes(len);
  return Array.from(buf, (b) => SLUG_ALPHABET[b % SLUG_ALPHABET.length]).join("");
}

export function slugify(name: string) {
  const base = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${base || "famille"}-${randomSuffix()}`;
}

/** 25 décembre de l'année en cours (ou de l'année suivante si on l'a dépassé). */
export function defaultEventDate(now = new Date()) {
  const year = now.getMonth() === 11 && now.getDate() > 25 ? now.getFullYear() + 1 : now.getFullYear();
  return new Date(Date.UTC(year, 11, 25, 12));
}

/** L'événement est terminé à partir du lendemain de sa date (heure de Paris). */
export function isEventOver(eventDate: Date, now = new Date()) {
  const day = parisDay(eventDate);
  const today = parisDay(now);
  return today > day;
}

export function parisDay(d: Date) {
  return new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(d); // AAAA-MM-JJ
}

export function daysUntil(eventDate: Date, now = new Date()) {
  const a = Date.parse(parisDay(eventDate));
  const b = Date.parse(parisDay(now));
  return Math.round((a - b) / 86_400_000);
}

export function hostnameOf(url?: string | null) {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

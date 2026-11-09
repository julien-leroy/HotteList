// Fonctions de mise en forme partagées entre serveur et navigateur.

export function initials(firstName: string, lastName?: string | null) {
  const a = firstName.trim()[0] ?? "?";
  const b = lastName?.trim()[0] ?? firstName.trim()[1] ?? "";
  return (a + b).toUpperCase();
}

export function displayName(u: { firstName: string; lastName?: string | null }) {
  return u.lastName ? `${u.firstName} ${u.lastName}` : u.firstName;
}

export function formatPrice(price?: string | null) {
  if (!price) return "Prix libre";
  const p = price.trim();
  if (/^\d+([.,]\d{1,2})?$/.test(p)) return `${p.replace(".", ",")} €`;
  return p;
}

export function relativeDate(iso: string | Date) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 7 * 86400) {
    const n = Math.floor(diff / 86400);
    return n === 1 ? "hier" : `il y a ${n} jours`;
  }
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function plural(n: number, one: string, many: string) {
  return `${n} ${n > 1 ? many : one}`;
}

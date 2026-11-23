import type { CheerioAPI } from "cheerio";

/** Reconnaît un domaine et ses sous-domaines : hostIs("fnac.com")("www.fnac.com") → true. */
export const hostIs =
  (...domains: (string | RegExp)[]) =>
  (host: string) =>
    domains.some((d) => (typeof d === "string" ? host === d || host.endsWith(`.${d}`) : d.test(host)));

/** Même adresse, sans paramètres de suivi ni ancre (en gardant ceux qu'on cite). */
export function stripQuery(url: URL, keep: string[] = []) {
  const u = new URL(url.toString());
  for (const k of [...u.searchParams.keys()]) if (!keep.includes(k)) u.searchParams.delete(k);
  u.hash = "";
  return u;
}

/** Texte du premier sélecteur trouvé. */
export function firstText($: CheerioAPI, selectors: string[]) {
  for (const s of selectors) {
    const v = $(s).first().text().replace(/\s+/g, " ").trim();
    if (v) return v;
  }
  return null;
}

/** Attribut du premier élément qui en a un. */
export function firstAttr($: CheerioAPI, selectors: string[], attrs: string[]) {
  for (const s of selectors) {
    const el = $(s).first();
    if (!el.length) continue;
    for (const a of attrs) {
      const v = el.attr(a);
      if (v && v.trim()) return v.trim();
    }
  }
  return null;
}

/** Première capture d'une liste d'expressions dans le HTML (données embarquées dans des <script>). */
export function scan(html: string, patterns: RegExp[]) {
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return unescapeJs(m[1]);
  }
  return null;
}

/** « / » et « \/ » des chaînes JSON embarquées. */
export function unescapeJs(s: string) {
  return s
    .replace(/\\u([0-9a-f]{4})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\\//g, "/")
    .replace(/\\"/g, '"');
}

/** Dernier morceau du chemin, sans le vide final. */
export function segments(url: URL) {
  return url.pathname.split("/").filter(Boolean);
}

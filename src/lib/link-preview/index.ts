import "server-only";
import { hostnameOf } from "../utils";
import { fetchPage } from "./fetcher";
import { parsePreview, previewFromUrl, type Trace } from "./parse";
import { adapterFor } from "./sites";
import type { LinkPreview } from "./types";

// Lecture d'un lien collé : titre, adresse de l'image et prix.
//   1. l'adaptateur du site (s'il est connu) nettoie l'adresse et règle la requête ;
//   2. on lit la page (fetcher.ts : réseau local bloqué, 7 s, 2 Mo) ;
//   3. parse.ts interroge l'adaptateur puis JSON-LD, Open Graph, microdonnées ;
//   4. si le site refuse, on garde ce que l'adresse elle-même laisse deviner.
// Les résultats restent en mémoire un moment : un même lien n'est pas relu à chaque frappe.

export type { LinkPreview, PreviewStatus } from "./types";
export { isPrivateAddress } from "./net";
export { normalizePrice } from "./price";
export { parsePreview } from "./parse";

const OK_TTL = 24 * 3600_000;
const FAIL_TTL = 3600_000;
const MAX_ENTRIES = 500;
const cache = new Map<string, { at: number; ttl: number; value: LinkPreview }>();

function remember(key: string, value: LinkPreview) {
  const ttl = value.status === "complete" || value.status === "partial" ? OK_TTL : FAIL_TTL;
  cache.delete(key);
  cache.set(key, { at: Date.now(), ttl, value });
  while (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value!);
}

function recall(key: string) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > hit.ttl) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

function log(url: URL, adapter: string | null, httpStatus: number | string, p: LinkPreview, trace: Trace, ms: number) {
  const found = (["title", "imageUrl", "price"] as const).map((k) => `${k}=${p[k] ? trace[k] ?? "?" : "-"}`).join(" ");
  console.info(`[apercu-lien] ${url.hostname} site=${adapter ?? "inconnu"} http=${httpStatus} ${p.status} ${found} ${ms}ms`);
}

export async function fetchLinkPreview(input: string): Promise<LinkPreview> {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return { title: null, imageUrl: null, price: null, currency: null, siteOrigin: hostnameOf(input), siteName: null, status: "empty" };
  }
  const first = adapterFor(url);
  if (first?.normalizeUrl) url = first.normalizeUrl(url);
  const key = url.toString();
  const cached = recall(key);
  if (cached) return cached;

  const t0 = Date.now();
  let result: LinkPreview & { trace: Trace };
  let httpStatus: number | string = "erreur";
  try {
    const page = await fetchPage(url, first?.headers);
    httpStatus = page.status;
    // après redirection (lien court amzn.eu, a.aliexpress.com…), c'est le site d'arrivée qui compte
    const final = adapterFor(page.url) ?? first;
    const isHtml = !page.contentType || /html|xml/i.test(page.contentType);
    result = page.body && isHtml ? parsePreview(page.body, page.url, page.status) : previewFromUrl(page.url);
    if (result.status === "empty" && page.status >= 400) result = previewFromUrl(page.url);
    log(page.url, final?.id ?? null, httpStatus, result, result.trace, Date.now() - t0);
  } catch {
    result = previewFromUrl(url);
    log(url, first?.id ?? null, httpStatus, result, result.trace, Date.now() - t0);
  }
  // l'adresse d'origine contient parfois le nom du produit que l'adresse nettoyée a perdu
  // (Amazon : « /Sony-WH-1000XM5/dp/B09… » → « /dp/B09… »)
  if (!result.title) result.title = previewFromUrl(new URL(input)).title;
  const { trace: _trace, ...preview } = result;
  void _trace;
  remember(key, preview);
  return preview;
}

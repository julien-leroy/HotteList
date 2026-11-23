import * as cheerio from "cheerio";
import { hostnameOf } from "../utils";
import { fromFallbacks, fromJsonLd, fromMicrodata, fromOpenGraph, genericFromUrl, looksBlocked, siteNameOf } from "./extractors";
import { currencyOf, normalizePrice, priceForField } from "./price";
import { adapterFor } from "./sites";
import type { Candidate, Fields, LinkPreview, Page, SiteAdapter } from "./types";

// Assemblage : on interroge chaque source dans l'ordre de confiance et, champ par champ,
// on garde la première réponse utilisable. Module pur (sans réseau), testé à part.

export type Source = "site" | "jsonld" | "opengraph" | "microdata" | "fallback" | "url";
export type Trace = Partial<Record<keyof Fields, Source>>;

function absolutize(src: string | null | undefined, base: URL) {
  if (!src) return null;
  try {
    const u = new URL(src.trim().replace(/^\/\//, "https://"), base);
    if (u.protocol === "http:") u.protocol = "https:"; // le site est en HTTPS : pas d'image « mixte »
    if (u.protocol !== "https:") return null;
    if (/\.svg($|\?)/i.test(u.pathname) || /(^|\/)(logo|sprite|pixel|blank|spacer)[^/]*$/i.test(u.pathname)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

function cleanTitle(raw: string | null | undefined, adapter: SiteAdapter | null, siteName: string | null) {
  if (!raw) return null;
  let t = raw.replace(/\s+/g, " ").trim();
  if (adapter?.cleanTitle) t = adapter.cleanTitle(t);
  if (siteName) {
    const n = siteName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    t = t.replace(new RegExp(`\\s*[|–—:-]\\s*${n}\\s*$`, "i"), "").replace(new RegExp(`^${n}\\s*[|–—:-]\\s*`, "i"), "");
  }
  t = t.trim().slice(0, 200);
  return t.length >= 2 ? t : null;
}

/** Fusionne les candidats : le premier qui a une valeur l'emporte, champ par champ. */
function merge(sources: [Source, Candidate][]) {
  const out: Candidate = {};
  const trace: Trace = {};
  for (const [src, c] of sources) {
    for (const k of ["title", "imageUrl", "price"] as const) {
      const v = c[k];
      if (!out[k] && typeof v === "string" && v.trim()) {
        out[k] = v.trim();
        trace[k] = src;
        if (k === "price") {
          out.currency = c.currency ?? currencyOf(v);
          if (out.currency) trace.currency = src;
        }
      }
    }
  }
  return { out, trace };
}

/** Titre envoyé par le navigateur ou l'appli qui partage (« … - Achat & prix | fnac ») : même nettoyage qu'une page. */
export function cleanSharedTitle(raw: string | null | undefined, url: URL | null) {
  const adapter = url ? adapterFor(url) : null;
  return cleanTitle(raw, adapter, adapter?.name ?? null);
}

/** Ce qu'on peut dire sans la page (lien bloqué ou illisible). */
export function previewFromUrl(url: URL): LinkPreview & { trace: Trace } {
  const adapter = adapterFor(url);
  const { out, trace } = merge([
    ["url", adapter?.fromUrl?.(url) ?? {}],
    ["url", adapter ? {} : genericFromUrl(url)],
  ]);
  const title = cleanTitle(out.title, adapter, null);
  return {
    title,
    imageUrl: null,
    price: null,
    currency: null,
    siteOrigin: hostnameOf(url.toString()),
    siteName: adapter?.name ?? null,
    status: "blocked",
    trace,
  };
}

export function parsePreview(html: string, url: URL, status = 200): LinkPreview & { trace: Trace } {
  const $ = cheerio.load(html);
  const page: Page = { $, html, url, status };
  const adapter = adapterFor(url);
  const blocked = Boolean(adapter?.isBlocked?.(page)) || looksBlocked(html, status);

  // Page anti-robot : rien de ce qu'elle contient ne parle du produit (titre et image du captcha…)
  const pageSources: [Source, Candidate][] = blocked
    ? []
    : [
        ["site", adapter?.extract ? safe(() => adapter.extract!(page)) : {}],
        ["jsonld", safe(() => fromJsonLd($))],
        ["opengraph", fromOpenGraph($)],
        ["microdata", fromMicrodata($)],
        // le <title> d'une page d'erreur ne vaut rien
        ["fallback", status >= 400 ? {} : fromFallbacks($)],
      ];
  const { out, trace } = merge([
    ...pageSources,
    ["url", adapter?.fromUrl?.(url) ?? {}],
    ["url", adapter ? {} : genericFromUrl(url)],
  ]);

  const price = normalizePrice(out.price);
  const currency = price ? (currencyOf(out.currency) ?? currencyOf(out.price) ?? null) : null;
  const preview: LinkPreview = {
    title: cleanTitle(out.title, adapter, siteNameOf($) ?? adapter?.name ?? null),
    imageUrl: ((img) => (img && adapter?.cleanImage ? adapter.cleanImage(img) : img))(absolutize(out.imageUrl, url)),
    price: priceForField(price, currency),
    currency,
    siteOrigin: hostnameOf(url.toString()),
    siteName: adapter?.name ?? siteNameOf($),
    status: "empty",
  };
  const fromPage = Object.entries(trace).some(([, s]) => s !== "url");
  preview.status =
    blocked && !fromPage
      ? "blocked"
      : preview.title && preview.imageUrl && preview.price
        ? "complete"
        : preview.title || preview.imageUrl
          ? "partial"
          : "empty";
  return { ...preview, trace };
}

function safe(fn: () => Candidate): Candidate {
  try {
    return fn() ?? {};
  } catch {
    return {};
  }
}

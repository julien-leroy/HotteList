import type { CheerioAPI } from "cheerio";
import type { Candidate } from "./types";

// Extracteurs génériques : ce que la plupart des boutiques publient pour Google et les réseaux sociaux.

type Json = Record<string, unknown>;

const PRODUCT_TYPES = ["Product", "ProductGroup", "IndividualProduct", "ProductModel", "Vehicle", "Car", "SomeProducts"];

function typesOf(n: Json): string[] {
  const t = n["@type"];
  return (Array.isArray(t) ? t : [t]).filter((x): x is string => typeof x === "string").map((x) => x.replace(/^.*[/#]/, ""));
}

/** Parcourt toute la structure (tableaux, @graph, mainEntity…) et rend chaque objet. */
function* walk(v: unknown, depth = 0): Generator<Json> {
  if (depth > 6 || v == null || typeof v !== "object") return;
  if (Array.isArray(v)) {
    for (const x of v) yield* walk(x, depth + 1);
    return;
  }
  const o = v as Json;
  yield o;
  for (const key of ["@graph", "mainEntity", "mainEntityOfPage", "itemOffered", "about"]) {
    if (o[key]) yield* walk(o[key], depth + 1);
  }
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    try {
      // retours à la ligne bruts dans les chaînes, virgules en trop : fréquents
      return JSON.parse(text.replace(/[\u0000-\u001f]+/g, " ").replace(/,\s*([}\]])/g, "$1"));
    } catch {
      return null;
    }
  }
}

/** Première adresse d'image dans une chaîne, une liste ou un ImageObject. */
export function pickImage(v: unknown, depth = 0): string | null {
  if (depth > 4 || v == null) return null;
  if (typeof v === "string") return v.trim() || null;
  if (Array.isArray(v)) {
    for (const x of v) {
      const r = pickImage(x, depth + 1);
      if (r) return r;
    }
    return null;
  }
  if (typeof v === "object") {
    const o = v as Json;
    return pickImage(o.contentUrl ?? o.url ?? o.thumbnailUrl ?? o["@id"], depth + 1);
  }
  return null;
}

function pickOffer(v: unknown, depth = 0): { price: string | null; currency: string | null } {
  const none = { price: null, currency: null };
  if (depth > 4 || v == null || typeof v !== "object") return none;
  if (Array.isArray(v)) {
    for (const x of v) {
      const r = pickOffer(x, depth + 1);
      if (r.price) return r;
    }
    return none;
  }
  const o = v as Json;
  const raw = o.price ?? o.lowPrice ?? o.highPrice;
  if (raw != null && raw !== "") return { price: String(raw), currency: typeof o.priceCurrency === "string" ? o.priceCurrency : null };
  if (o.priceSpecification) return pickOffer(o.priceSpecification, depth + 1);
  if (o.offers) return pickOffer(o.offers, depth + 1);
  return none;
}

export function fromJsonLd($: CheerioAPI): Candidate {
  const out: Candidate = {};
  $('script[type="application/ld+json"]').each((_, el) => {
    if (out.title && out.imageUrl && out.price) return false;
    for (const n of walk(parseJson($(el).text()))) {
      const types = typesOf(n);
      const isProduct = types.some((t) => PRODUCT_TYPES.includes(t)) || (n.offers != null && typeof n.name === "string");
      if (!isProduct) continue;
      if (!out.title && typeof n.name === "string") out.title = n.name;
      if (!out.imageUrl) out.imageUrl = pickImage(n.image);
      if (!out.price) {
        let offer = pickOffer(n.offers);
        // ProductGroup (variantes, boutiques Shopify) : le prix est sur les variantes
        if (!offer.price && n.hasVariant) {
          for (const v of walk(n.hasVariant)) {
            if (!out.imageUrl) out.imageUrl = pickImage(v.image);
            offer = pickOffer(v.offers);
            if (offer.price) break;
          }
        }
        if (offer.price) {
          out.price = offer.price;
          out.currency = offer.currency;
        }
      }
    }
  });
  return out;
}

function meta($: CheerioAPI, ...names: string[]) {
  for (const n of names) {
    const v = $(`meta[property="${n}"]`).attr("content") ?? $(`meta[name="${n}"]`).attr("content");
    if (v && v.trim()) return v.trim();
  }
  return null;
}

export function fromOpenGraph($: CheerioAPI): Candidate {
  return {
    title: meta($, "og:title", "twitter:title"),
    imageUrl: meta($, "og:image:secure_url", "og:image", "og:image:url", "twitter:image", "twitter:image:src"),
    price: meta($, "product:price:amount", "og:price:amount", "product:sale_price:amount"),
    currency: meta($, "product:price:currency", "og:price:currency"),
  };
}

export function siteNameOf($: CheerioAPI) {
  return meta($, "og:site_name", "application-name");
}

export function fromMicrodata($: CheerioAPI): Candidate {
  const scope = $('[itemtype*="schema.org/Product"]').first();
  const attr = (sel: string, ...attrs: string[]) => {
    const el = (scope.length ? scope.find(sel) : $(sel)).first();
    if (!el.length) return null;
    for (const a of attrs) {
      const v = a === "text" ? el.text() : el.attr(a);
      if (v && v.trim()) return v.trim();
    }
    return null;
  };
  return {
    title: scope.length ? attr('[itemprop="name"]', "content", "text") : null,
    imageUrl: attr('[itemprop="image"]', "content", "src", "href"),
    price: attr('[itemprop="price"]', "content", "text"),
    currency: attr('[itemprop="priceCurrency"]', "content", "text"),
  };
}

/** Derniers recours : balise <title> et image déclarée à l'ancienne. */
export function fromFallbacks($: CheerioAPI): Candidate {
  return {
    title: $("title").first().text().trim() || null,
    imageUrl: $('link[rel="image_src"]').attr("href") ?? null,
  };
}

/** Pages anti-robot courantes (Datadome, Cloudflare, PerimeterX, Akamai). */
export function looksBlocked(html: string, status: number) {
  if ([401, 403, 405, 429, 503].includes(status)) return true;
  return /captcha-delivery\.com|geo\.captcha|cf-chl-|challenge-platform|<title>\s*Just a moment|px-captcha|perimeterx|Access Denied<\/title>|Pardon Our Interruption/i.test(
    html.slice(0, 60_000),
  );
}

// ---------- Titre deviné depuis l'adresse ----------

const STOP = /^(p|dp|ad|ads|item|items|produit|product|products|fr|en|shop|buy|mp|html?|index)$/i;

/** « tente-de-camping-mh100-2-places » → « Tente de camping mh100 2 places ». */
export function titleFromSlug(segment: string | null | undefined): string | null {
  if (!segment) return null;
  let s: string;
  try {
    s = decodeURIComponent(segment);
  } catch {
    s = segment;
  }
  s = s
    .replace(/\.(html?|aspx|php)$/i, "")
    .replace(/^\d+[-_]/, "") // identifiant en tête (« 123456-pull-zara »)
    .replace(/[-_+]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = s.split(" ").filter((w) => /[a-zà-ÿ]/i.test(w));
  if (words.length < 2 || s.length < 6) return null;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Pour un site inconnu : le plus long morceau de chemin qui ressemble à un nom. */
export function genericFromUrl(url: URL): Candidate {
  const segs = url.pathname.split("/").filter((x) => x && !STOP.test(x));
  const best = segs
    .map((x) => titleFromSlug(x))
    .filter((x): x is string => Boolean(x))
    .sort((a, b) => b.length - a.length)[0];
  return { title: best ?? null };
}

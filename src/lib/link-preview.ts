import "server-only";
import http from "node:http";
import https from "node:https";
import dns from "node:dns";
import net from "node:net";
import zlib from "node:zlib";
import * as cheerio from "cheerio";
import { hostnameOf } from "./utils";

// Lecture d'une page produit pour en tirer titre, adresse d'image et prix.
// Le serveur étant à la maison, on bloque toute adresse du réseau local,
// y compris après une redirection ou une résolution DNS piégée.

const TIMEOUT_MS = 7000;
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 4;

export type LinkPreview = {
  title: string | null;
  imageUrl: string | null;
  price: string | null;
  siteOrigin: string | null;
};

export function isPrivateAddress(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase();
    if (v === "::" || v === "::1") return true;
    const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    return /^(fc|fd|fe8|fe9|fea|feb|ff)/.test(v) || v.startsWith("64:ff9b");
  }
  return true;
}

// Résolution DNS qui refuse les adresses privées : la vérification a lieu
// au moment même de la connexion, donc impossible de la contourner.
const safeLookup: net.LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return (callback as (e: Error) => void)(err);
    const list = addresses as dns.LookupAddress[];
    const bad = list.find((a) => isPrivateAddress(a.address));
    if (!list.length || bad) {
      return (callback as (e: Error) => void)(new Error("Adresse refusée"));
    }
    if ((options as dns.LookupOptions).all) return (callback as (e: null, a: dns.LookupAddress[]) => void)(null, list);
    (callback as (e: null, a: string, f: number) => void)(null, list[0].address, list[0].family);
  });
};

function fetchOnce(url: URL): Promise<{ status: number; location?: string; body?: string; contentType?: string }> {
  return new Promise((resolve, reject) => {
    if (url.protocol !== "http:" && url.protocol !== "https:") return reject(new Error("Protocole refusé"));
    if (url.port && url.port !== "80" && url.port !== "443") return reject(new Error("Port refusé"));
    if (net.isIP(url.hostname.replace(/^\[|\]$/g, "")) && isPrivateAddress(url.hostname.replace(/^\[|\]$/g, ""))) {
      return reject(new Error("Adresse refusée"));
    }
    const lib = url.protocol === "https:" ? https : http;
    const req = lib.request(
      url,
      {
        method: "GET",
        lookup: safeLookup,
        timeout: TIMEOUT_MS,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36 HotteList",
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.5",
          "Accept-Encoding": "gzip, deflate, br",
        },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume();
          return resolve({ status, location: res.headers.location });
        }
        const contentType = String(res.headers["content-type"] ?? "");
        let stream: NodeJS.ReadableStream = res;
        const enc = String(res.headers["content-encoding"] ?? "");
        if (enc.includes("br")) stream = res.pipe(zlib.createBrotliDecompress());
        else if (enc.includes("gzip")) stream = res.pipe(zlib.createGunzip());
        else if (enc.includes("deflate")) stream = res.pipe(zlib.createInflate());
        const chunks: Buffer[] = [];
        let size = 0;
        stream.on("data", (c: Buffer) => {
          size += c.length;
          if (size > MAX_BYTES) {
            req.destroy();
            resolve({ status, contentType, body: Buffer.concat(chunks).toString("utf8") });
            return;
          }
          chunks.push(c);
        });
        stream.on("end", () => resolve({ status, contentType, body: Buffer.concat(chunks).toString("utf8") }));
        stream.on("error", reject);
      },
    );
    req.on("timeout", () => req.destroy(new Error("Délai dépassé")));
    req.on("error", reject);
    req.end();
  });
}

async function fetchHtml(input: string) {
  let url = new URL(input);
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const res = await fetchOnce(url);
    if (res.location) {
      url = new URL(res.location, url);
      continue;
    }
    return { url, ...res };
  }
  throw new Error("Trop de redirections");
}

function absolutize(src: string | undefined | null, base: URL) {
  if (!src) return null;
  try {
    const u = new URL(src.trim(), base);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export function normalizePrice(raw: string | null | undefined) {
  if (!raw) return null;
  const m = String(raw).replace(/\s/g, "").match(/(\d+(?:[.,]\d{1,2})?)/);
  if (!m) return null;
  return m[1].replace(".", ",");
}

export function parsePreview(html: string, pageUrl: URL): LinkPreview {
  const $ = cheerio.load(html);
  const meta = (...names: string[]) => {
    for (const n of names) {
      const v = $(`meta[property="${n}"]`).attr("content") ?? $(`meta[name="${n}"]`).attr("content");
      if (v && v.trim()) return v.trim();
    }
    return null;
  };

  let title = meta("og:title", "twitter:title") ?? ($("title").first().text().trim() || null);
  let image = meta("og:image:secure_url", "og:image", "twitter:image", "twitter:image:src");
  let price = meta("product:price:amount", "og:price:amount", "twitter:data1");

  // Données structurées JSON-LD (Fnac, Decathlon, beaucoup de boutiques)
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).text());
      const nodes: unknown[] = Array.isArray(data) ? data : data["@graph"] ?? [data];
      for (const n of nodes as Record<string, unknown>[]) {
        const type = n?.["@type"];
        if (type !== "Product" && !(Array.isArray(type) && type.includes("Product"))) continue;
        if (!title && typeof n.name === "string") title = n.name;
        if (!image) {
          const img = n.image as unknown;
          image = typeof img === "string" ? img : Array.isArray(img) ? String(img[0]) : (img as { url?: string })?.url ?? null;
        }
        if (!price) {
          const offers = (Array.isArray(n.offers) ? n.offers[0] : n.offers) as Record<string, unknown> | undefined;
          const p = offers?.price ?? offers?.lowPrice;
          if (p != null) price = String(p);
        }
      }
    } catch {
      /* JSON-LD invalide : on ignore */
    }
  });

  if (!price) price = $('[itemprop="price"]').first().attr("content") ?? null;
  // Amazon : image principale et prix dans des balises dédiées
  if (!image) image = $("#landingImage").attr("data-old-hires") || $("#landingImage").attr("src") || null;
  if (!price) price = $(".a-price .a-offscreen").first().text() || null;

  if (title) title = title.replace(/\s+/g, " ").replace(/\s*[:|-]\s*Amazon\.fr.*$/i, "").slice(0, 200);

  return {
    title: title || null,
    imageUrl: absolutize(image, pageUrl),
    price: normalizePrice(price),
    siteOrigin: hostnameOf(pageUrl.toString()),
  };
}

export async function fetchLinkPreview(input: string): Promise<LinkPreview> {
  const empty: LinkPreview = { title: null, imageUrl: null, price: null, siteOrigin: hostnameOf(input) };
  try {
    const res = await fetchHtml(input);
    if (!res.body || res.status >= 400 || (res.contentType && !res.contentType.includes("html"))) return empty;
    return parsePreview(res.body, res.url);
  } catch {
    return empty;
  }
}

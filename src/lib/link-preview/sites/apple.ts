import type { SiteAdapter } from "../types";
import { hostIs, scan, segments, stripQuery } from "./helpers";

// Apple : bonnes balises Open Graph, prix dans les données de la page d'achat.

const BRAND: [RegExp, string][] = [
  [/\biphone\b/gi, "iPhone"],
  [/\bipad\b/gi, "iPad"],
  [/\bimac\b/gi, "iMac"],
  [/\bmacbook\b/gi, "MacBook"],
  [/\bairpods\b/gi, "AirPods"],
  [/\bairtag\b/gi, "AirTag"],
  [/\bapple watch\b/gi, "Apple Watch"],
  [/\bhomepod\b/gi, "HomePod"],
  [/\bapple tv\b/gi, "Apple TV"],
  [/\bpro\b/gi, "Pro"],
  [/\bmax\b/gi, "Max"],
  [/\bair\b/gi, "Air"],
];

export function appleCase(s: string) {
  return BRAND.reduce((acc, [re, to]) => acc.replace(re, to), s);
}

export const apple: SiteAdapter = {
  id: "apple",
  name: "Apple",
  match: hostIs("apple.com"),
  normalizeUrl: (url) => stripQuery(url),
  extract: ({ html }) => ({
    price: scan(html, [
      /"currentPrice"\s*:\s*\{[^}]*"raw_amount"\s*:\s*"([\d.]+)"/,
      /"currentPrice"\s*:\s*\{[^}]*"amount"\s*:\s*"([^"]+)"/,
      /"fullPrice"\s*:\s*"([^"]+)"/,
    ]),
  }),
  // « …?wid=5120&hei=2880… » : on demande une version de 1200 px de large au plus
  cleanImage: (src) => {
    try {
      const u = new URL(src);
      const w = Number(u.searchParams.get("wid"));
      const h = Number(u.searchParams.get("hei"));
      if (w > 1200) {
        u.searchParams.set("wid", "1200");
        if (h) u.searchParams.set("hei", String(Math.round((h * 1200) / w)));
      }
      return u.toString();
    } catch {
      return src;
    }
  },
  cleanTitle: (t) => {
    const s: string = t
      .replace(/\s*[-–|]\s*Apple(\s*\([A-Z]{2}\))?\s*$/i, "")
      .replace(/^Acheter\s+(?:un |une |le |la |les |des |l['’])?/i, "");
    return s;
  },
  // « /fr/shop/buy-iphone/iphone-16 » ou « /fr/shop/product/MX2D3ZM/A/airpods-pro-2 »
  fromUrl: (url) => {
    const last = segments(url).filter((s) => !/^[A-Z0-9]{5,}$|^A$/.test(s)).pop() ?? "";
    const words = last.replace(/^buy-/, "").replace(/-+/g, " ").trim();
    return { title: /[a-z]{3}/i.test(words) ? appleCase(words.charAt(0).toUpperCase() + words.slice(1)) : null };
  },
};

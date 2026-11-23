import type { Candidate, SiteAdapter } from "../types";
import { hostIs, stripQuery } from "./helpers";

// Leboncoin est une application Next.js : l'annonce complète est dans __NEXT_DATA__.
// Protégé par Datadome : la page est souvent refusée, et l'adresse ne contient pas le titre.

type Ad = {
  subject?: string;
  price?: number[] | number;
  price_cents?: number;
  images?: { urls_large?: string[]; urls?: string[]; thumb_url?: string; small_url?: string };
};

function adOf(json: string): Ad | null {
  try {
    const data = JSON.parse(json) as { props?: { pageProps?: { ad?: Ad } } };
    return data.props?.pageProps?.ad ?? null;
  } catch {
    return null;
  }
}

export const leboncoin: SiteAdapter = {
  id: "leboncoin",
  name: "Leboncoin",
  match: hostIs("leboncoin.fr"),
  normalizeUrl: (url) => stripQuery(url),
  extract: ({ $ }): Candidate => {
    const ad = adOf($("script#__NEXT_DATA__").text());
    if (!ad) return {};
    const price = Array.isArray(ad.price) ? ad.price[0] : ad.price ?? (ad.price_cents != null ? ad.price_cents / 100 : undefined);
    return {
      title: ad.subject ?? null,
      imageUrl: ad.images?.urls_large?.[0] ?? ad.images?.urls?.[0] ?? ad.images?.thumb_url ?? ad.images?.small_url ?? null,
      price: price != null ? String(price) : null,
      currency: "EUR",
    };
  },
  cleanTitle: (t) => t.replace(/\s*[-|]\s*(?:[^-|]+\s*[-|]\s*)?leboncoin\s*$/i, ""),
};

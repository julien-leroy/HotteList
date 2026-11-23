import type { SiteAdapter } from "../types";
import { titleFromSlug } from "../extractors";
import { firstAttr, firstText, hostIs, segments, stripQuery } from "./helpers";

// Cdiscount : Open Graph, microdonnées et JSON-LD selon les pages.

export const cdiscount: SiteAdapter = {
  id: "cdiscount",
  name: "Cdiscount",
  match: hostIs("cdiscount.com"),
  normalizeUrl: (url) => stripQuery(url),
  extract: ({ $ }) => ({
    price: firstAttr($, ['[itemprop="price"]'], ["content"]) ?? firstText($, [".fpPrice", ".c-product__price", '[data-e2e="offer-price"]']),
    imageUrl: firstAttr($, ["#picture0", ".c-productImage img", "#fpImgMain img"], ["data-src", "src"]),
  }),
  cleanTitle: (t) => t.replace(/\s*[-|]\s*Cdiscount.*$/i, ""),
  // « /high-tech/casques/casque-sony-wh-1000xm5/f-1065408-son4548736132597.html »
  fromUrl: (url) => {
    const segs = segments(url);
    const i = segs.findIndex((s) => /^f-\d+/.test(s));
    return { title: titleFromSlug(i > 0 ? segs[i - 1] : null) };
  },
};

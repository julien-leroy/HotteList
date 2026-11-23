import type { SiteAdapter } from "../types";
import { titleFromSlug } from "../extractors";
import { firstText, hostIs, segments, stripQuery } from "./helpers";

// Fnac publie un JSON-LD Product complet ; protégé par Datadome, la page est souvent refusée.

export const fnac: SiteAdapter = {
  id: "fnac",
  name: "Fnac",
  match: hostIs(/(^|\.)fnac\.(com|be|ch|pt|es)$/),
  normalizeUrl: (url) => stripQuery(url),
  extract: ({ $ }) => ({
    price: firstText($, [".f-faPriceBox__price.userPrice", ".f-faPriceBox__price", ".f-priceBox-price", '[data-automation-id="product-price"]']),
  }),
  // « Casque Sony WH-1000XM5 - Casque audio - Achat & prix | fnac »
  cleanTitle: (t) =>
    /Achat\s*&\s*prix/i.test(t)
      ? t.replace(/\s*-\s*[^-]*-\s*Achat\s*&\s*prix.*$/i, "").replace(/\s*-\s*Achat\s*&\s*prix.*$/i, "")
      : t.replace(/\s*[|-]\s*fnac(\.com)?\s*$/i, ""),
  // « /a17220436/Sony-WH-1000XM5-Casque » ou « /mp12345/… » : le nom suit l'identifiant
  fromUrl: (url) => {
    const segs = segments(url);
    const i = segs.findIndex((s) => /^(a|mp)\d+$/i.test(s));
    return { title: titleFromSlug(i >= 0 ? segs[i + 1] : segs[segs.length - 1]) };
  },
};

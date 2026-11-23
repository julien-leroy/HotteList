import type { SiteAdapter } from "../types";
import { titleFromSlug } from "../extractors";
import { firstText, hostIs, segments, stripQuery } from "./helpers";

// Decathlon : JSON-LD Product (parfois ProductGroup), prix aussi dans la page.

export const decathlon: SiteAdapter = {
  id: "decathlon",
  name: "Decathlon",
  match: hostIs(/(^|\.)decathlon\.(fr|com|be|es|it|de|ch|pt|nl|co\.uk)$/),
  // « mc » = le modèle (couleur, taille) choisi : on le garde
  normalizeUrl: (url) => stripQuery(url, ["mc"]),
  extract: ({ $ }) => ({
    price: firstText($, ['[data-cs-override-id="prix"] .vp-price-amount', ".vp-price-amount", ".prc__active-price"]),
  }),
  cleanTitle: (t) => t.replace(/\s*[|-]\s*Decathlon.*$/i, ""),
  // « /p/tente-de-camping-mh100-2-places/_/R-p-301521 » ou « /p/mp/marque/nom-du-produit/_/R-p-… »
  fromUrl: (url) => {
    const segs = segments(url);
    const end = segs.indexOf("_");
    return { title: titleFromSlug(end > 0 ? segs[end - 1] : segs[segs.length - 1]) };
  },
};

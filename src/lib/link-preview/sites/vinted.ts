import type { SiteAdapter } from "../types";
import { titleFromSlug } from "../extractors";
import { hostIs, segments, stripQuery } from "./helpers";

// Vinted : Open Graph et JSON-LD ; protégé contre les robots, la page est souvent refusée.

export const vinted: SiteAdapter = {
  id: "vinted",
  name: "Vinted",
  match: hostIs(/(^|\.)vinted\.(fr|com|be|es|it|de|nl|lu|pt|pl|at|cz|lt|sk|co\.uk)$/),
  normalizeUrl: (url) => stripQuery(url),
  cleanTitle: (t) => t.replace(/\s*[|-]\s*Vinted\s*$/i, ""),
  // « /items/4567890123-pull-zara-taille-m »
  fromUrl: (url) => {
    const segs = segments(url);
    const i = segs.indexOf("items");
    return { title: titleFromSlug(i >= 0 ? segs[i + 1] : null), currency: "EUR" };
  },
};

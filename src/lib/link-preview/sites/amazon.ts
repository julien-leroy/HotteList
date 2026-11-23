import type { SiteAdapter } from "../types";
import { titleFromSlug } from "../extractors";
import { firstAttr, firstText, segments } from "./helpers";

// Amazon ne publie ni Open Graph ni JSON-LD : tout est dans des balises maison.
// Liens courts (amzn.eu, amzn.to, a.co) : le serveur suit la redirection et retombe ici.

const AMAZON = /(^|\.)amazon\.(com|fr|de|es|it|nl|be|se|pl|ca|co\.uk|com\.be|com\.tr)$/;
const ASIN = /\/(?:dp|gp\/product|gp\/aw\/d|exec\/obidos\/ASIN|o\/ASIN)\/([A-Z0-9]{10})(?=[/?]|$)/i;

export function asinOf(url: URL) {
  return url.pathname.match(ASIN)?.[1]?.toUpperCase() ?? null;
}

/** « …/I/71abc._AC_SX300_SY300_.jpg » → « …/I/71abc._AC_SL1000_.jpg » : 1000 px, net sans être énorme. */
export function fullSizeAmazonImage(src: string | null) {
  return src ? src.replace(/(\/I\/[^/.]+)(\._[^/]+_)?\.(jpe?g|png|webp)$/i, "$1._AC_SL1000_.$3") : null;
}

/** data-a-dynamic-image = { "adresse": [largeur, hauteur], … } : on garde la plus grande. */
function largestDynamic(json: string | null) {
  if (!json) return null;
  try {
    const entries = Object.entries(JSON.parse(json) as Record<string, [number, number]>);
    return entries.sort((a, b) => b[1][0] - a[1][0])[0]?.[0] ?? null;
  } catch {
    return null;
  }
}

export const amazon: SiteAdapter = {
  id: "amazon",
  name: "Amazon",
  match: (host) => AMAZON.test(host),
  normalizeUrl: (url) => {
    const asin = asinOf(url);
    return asin ? new URL(`https://${url.hostname}/dp/${asin}`) : url;
  },
  extract: ({ $ }) => {
    const image =
      firstAttr($, ["#landingImage", "#imgBlkFront", "#ebooksImgBlkFront", "#main-image"], ["data-old-hires"]) ||
      largestDynamic(firstAttr($, ["#landingImage", "#imgBlkFront", "#ebooksImgBlkFront"], ["data-a-dynamic-image"])) ||
      firstAttr($, ["#landingImage", "#imgTagWrapperId img", "#main-image"], ["src"]);
    const price =
      firstAttr($, ["#twister-plus-price-data-price", "input#attach-base-product-price"], ["value"]) ||
      firstText($, [
        "#corePrice_feature_div .a-price .a-offscreen",
        "#corePriceDisplay_desktop_feature_div .a-price .a-offscreen",
        "#apex_desktop .a-price .a-offscreen",
        "#priceblock_ourprice",
        "#priceblock_dealprice",
        "#kindle-price",
        "#price",
        ".a-price .a-offscreen",
      ]);
    const currency = firstAttr($, ["#twister-plus-price-data-price-unit"], ["value"]);
    return {
      title: firstText($, ["#productTitle", "#ebooksProductTitle"]),
      imageUrl: fullSizeAmazonImage(image),
      price,
      currency,
    };
  },
  cleanTitle: (t) => {
    const prefixed = /^Amazon\.[a-z.]+\s*:\s*/i.test(t);
    let s = t.replace(/^Amazon\.[a-z.]+\s*:\s*/i, "").replace(/\s*[:|-]\s*Amazon\.[a-z.]+.*$/i, "");
    // « Amazon.fr : Casque … : High-Tech » : la catégorie finale part avec le préfixe
    if (prefixed) s = s.replace(/\s*:\s*[^:]{2,40}$/, "");
    return s;
  },
  isBlocked: ({ html, $ }) =>
    /validateCaptcha|api-services-support@amazon\.com|Robot Check/i.test(html) ||
    /^amazon\.[a-z.]+$/i.test($("title").text().trim()),
  // « /Sony-WH-1000XM5-Bluetooth/dp/B09… » : le nom est juste avant /dp/
  fromUrl: (url) => {
    const segs = segments(url);
    const i = segs.findIndex((s) => /^(dp|gp)$/i.test(s));
    return { title: i > 0 ? titleFromSlug(segs[i - 1]) : null };
  },
};

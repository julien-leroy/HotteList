import type { SiteAdapter } from "../types";
import { hostIs, scan, stripQuery } from "./helpers";

// AliExpress affiche ses pages en JavaScript : le prix n'est pas dans les balises,
// mais dans les données embarquées (window.runParams ou équivalent).

export const aliexpress: SiteAdapter = {
  id: "aliexpress",
  name: "AliExpress",
  match: hostIs(/(^|\.)aliexpress\.(com|fr|us|ru)$/),
  normalizeUrl: (url) => {
    const id = url.pathname.match(/\/item\/(?:[^/]+\/)?(\d{6,})\.html/)?.[1];
    return id ? new URL(`https://fr.aliexpress.com/item/${id}.html`) : stripQuery(url);
  },
  // Demande la boutique française, en euros
  headers: { Cookie: "aep_usuc_f=site=fra&c_tp=EUR&region=FR&b_locale=fr_FR" },
  extract: ({ html }) => {
    const price = scan(html, [
      /"formatedActivityPrice"\s*:\s*"([^"]+)"/,
      /"skuActivityAmount"\s*:\s*\{[^}]*"formatedAmount"\s*:\s*"([^"]+)"/,
      /"formatedPrice"\s*:\s*"([^"]+)"/,
      /"formatedAmount"\s*:\s*"([^"]+)"/,
      /"minActivityAmount"\s*:\s*\{[^}]*"value"\s*:\s*([\d.]+)/,
      /"minAmount"\s*:\s*\{[^}]*"value"\s*:\s*([\d.]+)/,
    ]);
    return {
      title: scan(html, [/"subject"\s*:\s*"([^"]{4,})"/]),
      imageUrl: scan(html, [/"imagePathList"\s*:\s*\[\s*"([^"]+)"/, /"summImagePathList"\s*:\s*\[\s*"([^"]+)"/]),
      price,
      currency: scan(html, [/"currencyCode"\s*:\s*"([A-Z]{3})"/, /"currency"\s*:\s*"([A-Z]{3})"/]),
    };
  },
  cleanTitle: (t) => t.replace(/\s*[-|]\s*AliExpress(\s*\d+)?\s*$/i, "").replace(/^AliExpress\s*[-|:]\s*/i, ""),
  isBlocked: ({ html }) => /_____tmd_____|\/punish\?|x5secdata|baxia-punish/i.test(html.slice(0, 60_000)),
};

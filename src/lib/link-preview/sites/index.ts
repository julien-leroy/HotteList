import type { SiteAdapter } from "../types";
import { aliexpress } from "./aliexpress";
import { amazon } from "./amazon";
import { apple } from "./apple";
import { cdiscount } from "./cdiscount";
import { decathlon } from "./decathlon";
import { fnac } from "./fnac";
import { leboncoin } from "./leboncoin";
import { vinted } from "./vinted";

/**
 * Sites reconnus. Pour en ajouter un : créer `sites/<site>.ts` (voir fnac.ts, le plus simple),
 * l'ajouter ici et dans tests/link-preview-sites.test.ts.
 */
export const SITES: SiteAdapter[] = [amazon, aliexpress, fnac, apple, vinted, decathlon, cdiscount, leboncoin];

export function adapterFor(url: URL): SiteAdapter | null {
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  return SITES.find((s) => s.match(host)) ?? null;
}

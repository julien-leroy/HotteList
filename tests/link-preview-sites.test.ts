import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { parsePreview } = await import("@/lib/link-preview");
const { adapterFor, SITES } = await import("@/lib/link-preview/sites");

// Chaque paire tests/fixtures/sites/<nom>.html + <nom>.json est vérifiée ici.
const dir = path.join(__dirname, "fixtures/sites");
const cases = readdirSync(dir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => {
    const spec = JSON.parse(readFileSync(path.join(dir, f), "utf8")) as { url: string; status?: number; expected: Record<string, unknown> };
    return { name: f.replace(/\.json$/, ""), html: readFileSync(path.join(dir, f.replace(/\.json$/, ".html")), "utf8"), ...spec };
  });

describe("pages produit de référence", () => {
  it.each(cases.map((c) => [c.name, c] as const))("%s", (_, c) => {
    expect(parsePreview(c.html, new URL(c.url), c.status ?? 200)).toMatchObject(c.expected);
  });

  it("chaque site reconnu a au moins une page de référence", () => {
    for (const s of SITES) expect(cases.some((c) => adapterFor(new URL(c.url))?.id === s.id), s.id).toBe(true);
  });
});

describe("reconnaissance des sites", () => {
  it.each([
    ["https://www.amazon.fr/dp/B09Y2MYL5C", "amazon"],
    ["https://amazon.de/dp/B09Y2MYL5C", "amazon"],
    ["https://fr.aliexpress.com/item/1005006123456789.html", "aliexpress"],
    ["https://www.fnac.com/a1/x", "fnac"],
    ["https://fr.fnac.be/a1/x", "fnac"],
    ["https://www.apple.com/fr/shop/buy-iphone/iphone-16", "apple"],
    ["https://www.vinted.fr/items/1-x", "vinted"],
    ["https://www.decathlon.fr/p/x/_/R-p-1", "decathlon"],
    ["https://www.cdiscount.com/x/f-1-y.html", "cdiscount"],
    ["https://www.leboncoin.fr/ad/velos/1", "leboncoin"],
    ["https://www.fakeamazon.fr/dp/B09Y2MYL5C", null],
    ["https://monfnac.com/a1/x", null],
  ])("%s → %s", (u, id) => expect(adapterFor(new URL(u))?.id ?? null).toBe(id));
});

describe("adresses nettoyées avant lecture", () => {
  const norm = (u: string) => {
    const url = new URL(u);
    return adapterFor(url)!.normalizeUrl!(url).toString();
  };
  it.each([
    [
      "https://www.amazon.fr/Sony-WH-1000XM5/dp/B09Y2MYL5C/ref=sr_1_1?crid=2X&keywords=casque&qid=1&sr=8-1",
      "https://www.amazon.fr/dp/B09Y2MYL5C",
    ],
    ["https://www.amazon.fr/gp/product/B09Y2MYL5C?psc=1", "https://www.amazon.fr/dp/B09Y2MYL5C"],
    [
      "https://www.aliexpress.com/item/1005006123456789.html?spm=a2g0o.productlist&algo_pvid=abc",
      "https://fr.aliexpress.com/item/1005006123456789.html",
    ],
    ["https://www.fnac.com/a17220436/Sony-WH#omnsearchpos=1", "https://www.fnac.com/a17220436/Sony-WH"],
    ["https://www.decathlon.fr/p/tente/_/R-p-301521?mc=8326291&utm_source=x", "https://www.decathlon.fr/p/tente/_/R-p-301521?mc=8326291"],
    ["https://www.vinted.fr/items/123-pull?referrer=catalog", "https://www.vinted.fr/items/123-pull"],
  ])("%s", (u, expected) => expect(norm(u)).toBe(expected));
});

describe("titre deviné depuis l'adresse (page refusée)", () => {
  const fromUrl = (u: string) => {
    const url = new URL(u);
    return adapterFor(url)!.fromUrl!(url).title;
  };
  it.each([
    ["https://www.apple.com/fr/shop/buy-iphone/iphone-16-pro", "iPhone 16 Pro"],
    ["https://www.apple.com/fr/shop/product/MTJV3ZM/A/airpods-pro-2", "AirPods Pro 2"],
    ["https://www.cdiscount.com/jeux/console-nintendo-switch-oled/f-1030401-nin0045496453435.html", "Console nintendo switch oled"],
    ["https://www.decathlon.fr/p/mp/quechua/sac-a-dos-20l/_/R-p-x", "Sac a dos 20l"],
    ["https://www.vinted.fr/items/4567890123-pull-zara-laine", "Pull zara laine"],
  ])("%s", (u, expected) => expect(fromUrl(u)).toBe(expected));
});

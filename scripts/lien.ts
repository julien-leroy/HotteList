// Essayer la lecture d'un lien depuis le serveur, comme le fait le formulaire d'ajout.
//   npm run lien -- <adresse>                 affiche ce qui est trouvé, et d'où ça vient
//   npm run lien -- <adresse> --save fnac     enregistre la page dans tests/fixtures/sites/fnac.html (+ .json)
//   npm run lien -- --check                   relit les adresses de toutes les pages de référence :
//                                             signale les sites qui ne donnent plus titre, image ou prix
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fetchPage } from "../src/lib/link-preview/fetcher";
import { parsePreview, previewFromUrl } from "../src/lib/link-preview/parse";
import { adapterFor } from "../src/lib/link-preview/sites";

const FIXTURES = path.join(__dirname, "../tests/fixtures/sites");

/** Allège une page avant de l'enregistrer : styles, dessins, scripts externes et commentaires ne servent pas aux tests. */
function slim(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script[^>]*\bsrc=[^>]*><\/script>/gi, "")
    .replace(/<link[^>]*rel="?(stylesheet|preload|prefetch|preconnect|dns-prefetch|modulepreload)"?[^>]*>/gi, "")
    // gros scripts de l'application (souvent > 1 Mo) : inutiles, sauf les données JSON
    .replace(/<script(?![^>]*(ld\+json|__NEXT_DATA__))[^>]*>([\s\S]*?)<\/script>/gi, (m, _t, body: string) => (body.length > 100_000 ? "" : m))
    // clés d'API publiées par le site dans sa page (Mapbox, Google…) : GitHub refuse de les héberger
    .replace(/\b(sk|pk|tk)\.eyJ[A-Za-z0-9._-]+/g, "$1.CLE-RETIREE")
    .replace(/\bAIza[0-9A-Za-z_-]{30,}/g, "AIza-CLE-RETIREE")
    .replace(/\s{2,}/g, " ");
}

async function read(input: string) {
  let url = new URL(input);
  const adapter = adapterFor(url);
  if (adapter?.normalizeUrl) url = adapter.normalizeUrl(url);
  const page = await fetchPage(url, adapter?.headers);
  const result = page.body ? parsePreview(page.body, page.url, page.status) : previewFromUrl(page.url);
  if (!result.title) result.title = previewFromUrl(new URL(input)).title;
  return { url, page, result };
}

async function one(input: string, save: string | null) {
  const { url, page, result } = await read(input);
  const { trace, ...p } = result;
  console.log(`\nAdresse lue : ${url}${page.url.toString() !== url.toString() ? `\n  → arrivée : ${page.url}` : ""}`);
  console.log(`Site : ${p.siteName ?? "inconnu"} · HTTP ${page.status} · ${page.body.length} caractères · ${p.status}\n`);
  for (const k of ["title", "imageUrl", "price", "currency"] as const) {
    console.log(`  ${k.padEnd(9)} ${p[k] ?? "—"}${p[k] && trace[k] ? `   (${trace[k]})` : ""}`);
  }
  if (save) {
    writeFileSync(path.join(FIXTURES, `${save}.html`), slim(page.body));
    const { title, imageUrl, price, status } = p;
    writeFileSync(
      path.join(FIXTURES, `${save}.json`),
      JSON.stringify({ url: page.url.toString(), status: page.status, expected: { title, imageUrl, price, status } }, null, 2) + "\n",
    );
    console.log(`\nEnregistré : tests/fixtures/sites/${save}.html et .json — relisez le .json avant de valider.`);
  }
}

async function check() {
  const specs = readdirSync(FIXTURES).filter((f) => f.endsWith(".json"));
  let bad = 0;
  for (const f of specs) {
    const spec = JSON.parse(readFileSync(path.join(FIXTURES, f), "utf8")) as { url: string; expected: { status?: string } };
    if (spec.expected.status === "blocked") continue; // cas volontairement bloqués
    try {
      const { page, result } = await read(spec.url);
      const missing = (["title", "imageUrl", "price"] as const).filter((k) => !result[k]);
      const ok = missing.length === 0;
      if (!ok) bad++;
      console.log(`${ok ? "OK " : "!! "} ${f.replace(".json", "").padEnd(16)} HTTP ${page.status}  ${result.status}${ok ? "" : `  manque : ${missing.join(", ")}`}`);
    } catch (e) {
      bad++;
      console.log(`!!  ${f.replace(".json", "").padEnd(16)} erreur : ${(e as Error).message}`);
    }
  }
  console.log(bad ? `\n${bad} site(s) à regarder.` : "\nTout va bien.");
  process.exitCode = bad ? 1 : 0;
}

const args = process.argv.slice(2);
const run = args.includes("--check")
  ? check()
  : args[0]
    ? one(args[0], args.includes("--save") ? (args[args.indexOf("--save") + 1] ?? null) : null)
    : Promise.resolve(console.log("Usage : npm run lien -- <adresse> [--save nom]   |   npm run lien -- --check"));
run.catch((e) => {
  console.error(`Lecture impossible : ${(e as Error).message}`);
  process.exitCode = 1;
});

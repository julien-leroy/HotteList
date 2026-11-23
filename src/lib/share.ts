import { cleanSharedTitle } from "./link-preview/parse";

// Ce qu'une autre appli envoie par « Partager » (manifeste : share_target).
// Les applis rangent l'adresse tantôt dans « url », tantôt au milieu du texte
// (« Découvrez … sur Fnac https://… ») : on la cherche partout.

const URL_RE = /https?:\/\/[^\s<>"']+/i;

export function readShare(sp: { title?: string; text?: string; url?: string }) {
  const all = [sp.url, sp.text, sp.title].filter(Boolean).join(" ");
  const url = all.match(URL_RE)?.[0]?.replace(/[).,;!?»]+$/, "") ?? "";
  let parsed: URL | null = null;
  try {
    parsed = url ? new URL(url) : null;
  } catch {}
  // titre : le titre partagé, sinon le texte sans l'adresse ni les formules d'appli
  const rawTitle = [sp.title, sp.text]
    .map((t) =>
      (t ?? "")
        .replace(URL_RE, "")
        .replace(/^(découvrez|regarde[sz]?|voici|j'ai trouvé)\s*(ce produit|cet article|ça|ceci)?\s*:?\s*/i, "")
        .replace(/\s+(sur|on|chez)\s+[\w.]+\s*:?\s*$/i, "")
        .trim(),
    )
    .find((t) => t.length >= 3 && t !== url);
  return { url, title: cleanSharedTitle(rawTitle ?? "", parsed) ?? "" };
}

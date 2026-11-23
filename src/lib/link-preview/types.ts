import type { CheerioAPI } from "cheerio";

/** Ce qu'on cherche dans une page produit. */
export type Fields = {
  title: string | null;
  imageUrl: string | null;
  price: string | null;
  currency: string | null;
};

/** Ce qu'un extracteur a trouvé (un champ absent = rien trouvé). */
export type Candidate = Partial<Fields>;

/**
 * complete : titre, image et prix trouvés
 * partial  : au moins le titre ou l'image
 * blocked  : le site a refusé de montrer la page (anti-robot) ; ce qu'il y a vient du lien lui-même
 * empty    : rien trouvé
 */
export type PreviewStatus = "complete" | "partial" | "blocked" | "empty";

export type LinkPreview = Fields & {
  siteOrigin: string | null;
  /** nom lisible du site reconnu (« Amazon », « Fnac »…), null pour un site inconnu */
  siteName: string | null;
  status: PreviewStatus;
};

export type Page = { $: CheerioAPI; html: string; url: URL; status: number };

/**
 * Un adaptateur décrit ce qu'un site a de particulier. Tout est facultatif sauf
 * l'identifiant, le nom et la reconnaissance du domaine : les extracteurs génériques
 * (JSON-LD, Open Graph, microdonnées) font le reste.
 */
export type SiteAdapter = {
  id: string;
  name: string;
  /** reconnaît le domaine (sans « www. ») */
  match: (host: string) => boolean;
  /** adresse canonique : enlève le suivi publicitaire, garde l'identifiant du produit */
  normalizeUrl?: (url: URL) => URL;
  /** en-têtes en plus pour la requête (cookie de langue ou de devise, par exemple) */
  headers?: Record<string, string>;
  /** extraction propre au site, prioritaire sur les extracteurs génériques */
  extract?: (page: Page) => Candidate;
  /** nettoyage du titre (« … | Vinted » → « … ») */
  cleanTitle?: (title: string) => string;
  /** adresse d'image plus raisonnable (taille d'affichage plutôt que l'original de 5000 px) */
  cleanImage?: (src: string) => string;
  /** ce qu'on peut deviner depuis l'adresse seule, quand la page est bloquée */
  fromUrl?: (url: URL) => Candidate;
  /** page anti-robot propre au site */
  isBlocked?: (page: Page) => boolean;
};

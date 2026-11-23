// Illustrations génériques pour les cadeaux sans photo (une manette, une plante, une voiture…).
// On les enregistre dans Gift.imageUrl sous la forme « illu:<clé> » : rien à héberger, rien à migrer.
// Les dessins eux-mêmes sont dans src/components/gift-illustration.tsx.

export const ILLU_PREFIX = "illu:";

const TINT = {
  or: { bg: "#F6E7C1", ink: "#7A5410" },
  rose: { bg: "#F6DCDD", ink: "#7E1621" },
  sapin: { bg: "#DCEDE2", ink: "#1F4D36" },
  bleu: { bg: "#E2E8EE", ink: "#3E5A6E" },
  sable: { bg: "#EFE6D3", ink: "#5E4B2A" },
} as const;

export type Tint = { bg: string; ink: string };

type Def = { key: string; label: string; tint: Tint; words: string[] };

/** Ordre d'affichage dans le sélecteur. */
const DEFS: Def[] = [
  { key: "surprise", label: "Cadeau", tint: TINT.rose, words: [] },
  { key: "livre", label: "Livre", tint: TINT.sable, words: ["livre", "roman", "bd", "bande dessinee", "manga", "comics", "liseuse", "kindle", "kobo", "encyclopedie", "guide"] },
  { key: "jeu-video", label: "Jeu vidéo", tint: TINT.bleu, words: ["manette", "console", "ps5", "ps4", "playstation", "xbox", "switch", "nintendo", "jeu video", "jeux video", "steam deck", "zelda", "mario", "pokemon", "fifa", "ea sports", "minecraft"] },
  { key: "jouet", label: "Jouet", tint: TINT.or, words: ["lego", "playmobil", "duplo", "jouet", "poupee", "peluche", "figurine", "barbie", "hot wheels", "nerf", "dinosaure", "train en bois", "cuisine enfant"] },
  { key: "jeu-societe", label: "Jeu de société", tint: TINT.sapin, words: ["jeu de societe", "jeux de societe", "puzzle", "jeu de cartes", "dobble", "monopoly", "uno", "echecs", "time's up", "codenames", "catan", "dixit", "escape game"] },
  { key: "high-tech", label: "High-tech", tint: TINT.bleu, words: ["iphone", "smartphone", "telephone", "tablette", "ipad", "montre connectee", "apple watch", "chargeur", "batterie externe", "ordinateur", "pc portable", "macbook", "laptop", "clavier", "souris", "ecran", "ssd", "disque dur", "imprimante", "tv", "television", "videoprojecteur", "projecteur", "airtag"] },
  { key: "musique", label: "Musique", tint: TINT.or, words: ["casque", "ecouteurs", "airpods", "enceinte", "vinyle", "platine", "guitare", "piano", "ukulele", "batterie electronique", "sonos", "jbl", "bose", "marshall"] },
  { key: "photo", label: "Photo", tint: TINT.sable, words: ["appareil photo", "camera", "gopro", "objectif", "polaroid", "instax", "drone", "trepied", "album photo"] },
  { key: "mode", label: "Vêtement", tint: TINT.rose, words: ["pull", "tee shirt", "t shirt", "tshirt", "chemise", "robe", "pantalon", "jean", "jogging", "veste", "manteau", "doudoune", "sweat", "hoodie", "pyjama", "echarpe", "bonnet", "gants", "chaussettes", "chaussures", "baskets", "sneakers", "bottes", "chaussons", "sac a main", "ceinture", "jupe", "polaire"] },
  { key: "bijou", label: "Bijou, montre", tint: TINT.rose, words: ["bijou", "collier", "bague", "bracelet", "boucles d'oreilles", "boucles d oreilles", "pendentif", "montre", "gourmette", "alliance"] },
  { key: "beaute", label: "Beauté", tint: TINT.rose, words: ["parfum", "eau de toilette", "eau de parfum", "maquillage", "creme", "serum", "soin", "rouge a levres", "mascara", "coffret beaute", "vernis", "seche cheveux", "lisseur", "boucleur", "rasoir", "tondeuse", "palette"] },
  { key: "cuisine", label: "Cuisine", tint: TINT.sapin, words: ["cuisine", "casserole", "poele", "couteau", "thermomix", "cookeo", "airfryer", "air fryer", "friteuse", "mixeur", "blender", "robot patissier", "robot cuiseur", "moule", "tablier", "cafetiere", "machine a cafe", "nespresso", "tasse", "mug", "theiere", "bouilloire", "grille pain", "gaufrier", "raclette", "fondue", "plancha", "barbecue"] },
  { key: "gourmand", label: "Gourmandise", tint: TINT.or, words: ["chocolat", "bonbons", "biscuits", "calendrier de l'avent", "foie gras", "epicerie", "confiture", "miel", "cafe en grains", "the vert", "infusion", "coffret gourmand", "macarons"] },
  { key: "apero", label: "Vin, apéro", tint: TINT.rose, words: ["vin", "champagne", "whisky", "biere", "rhum", "gin", "cognac", "cave a vin", "tire bouchon", "cocktail", "verres", "carafe"] },
  { key: "maison", label: "Maison, déco", tint: TINT.sable, words: ["lampe", "bougie", "plaid", "coussin", "deco", "decoration", "cadre", "vase", "tapis", "luminaire", "diffuseur", "horloge", "affiche", "poster", "linge de lit", "couette", "aspirateur"] },
  { key: "plante", label: "Plante, jardin", tint: TINT.sapin, words: ["plante", "fleur", "bonsai", "jardin", "jardinage", "graines", "cactus", "orchidee", "arrosoir", "potager", "terrarium", "bouquet"] },
  { key: "sport", label: "Sport", tint: TINT.bleu, words: ["sport", "fitness", "yoga", "halteres", "musculation", "running", "course a pied", "ballon", "raquette", "tennis", "padel", "ski", "snowboard", "natation", "maillot", "football", "rugby", "boxe", "kettlebell", "velo d'appartement"] },
  { key: "plein-air", label: "Plein air", tint: TINT.sapin, words: ["tente", "camping", "randonnee", "rando", "sac a dos", "lampe frontale", "duvet", "sac de couchage", "gourde", "hamac", "boussole", "jumelles"] },
  { key: "velo", label: "Vélo, trottinette", tint: TINT.sapin, words: ["velo", "vtt", "bmx", "draisienne", "trottinette", "casque velo", "skate", "rollers", "gyroroue", "hoverboard"] },
  { key: "voiture", label: "Voiture", tint: TINT.bleu, words: ["voiture", "auto", "circuit", "voiture telecommandee", "stage de pilotage", "accessoire auto", "moto", "karting"] },
  { key: "sortie", label: "Sortie, expérience", tint: TINT.or, words: ["billet", "concert", "spectacle", "cinema", "theatre", "carte cadeau", "bon cadeau", "experience", "abonnement", "smartbox", "wonderbox", "atelier", "cours de", "massage", "parc d'attractions", "disneyland", "musee"] },
  { key: "voyage", label: "Voyage", tint: TINT.bleu, words: ["voyage", "valise", "bagage", "sac de voyage", "week end", "weekend", "sejour", "hotel", "billet d'avion", "trousse de toilette", "oreiller de voyage"] },
  { key: "creatif", label: "Loisirs créatifs", tint: TINT.or, words: ["peinture", "dessin", "feutres", "crayons", "aquarelle", "tricot", "crochet", "couture", "machine a coudre", "loisirs creatifs", "carnet", "scrapbooking", "perles", "pate a modeler", "cricut", "kit creatif"] },
  { key: "bebe", label: "Bébé", tint: TINT.rose, words: ["bebe", "naissance", "biberon", "poussette", "tetine", "doudou", "eveil", "tapis d'eveil", "body", "porte bebe", "babyphone", "chaise haute"] },
  { key: "animaux", label: "Animaux", tint: TINT.sable, words: ["chien", "chat", "croquettes", "laisse", "collier pour", "niche", "griffoir", "aquarium", "arbre a chat", "litiere", "lapin"] },
  { key: "bricolage", label: "Bricolage", tint: TINT.sable, words: ["perceuse", "visseuse", "outil", "outils", "bricolage", "boite a outils", "tournevis", "scie", "ponceuse", "niveau laser", "etabli", "makita", "dewalt", "ryobi"] },
];

/**
 * Ordre de recherche quand on devine depuis le titre : les plus précis d'abord
 * (« casque vélo » est un vélo avant d'être un casque audio, « montre connectée » de la high-tech).
 */
const GUESS_ORDER = [
  "velo", "voiture", "bebe", "animaux", "plein-air", "jeu-societe", "jeu-video", "jouet", "photo", "high-tech",
  "musique", "bijou", "beaute", "apero", "gourmand", "cuisine", "plante", "bricolage", "creatif", "voyage",
  "sortie", "sport", "mode", "maison", "livre",
];

export type Illustration = { key: string; label: string; tint: Tint };

export const ILLUSTRATIONS: Illustration[] = DEFS.map(({ key, label, tint }) => ({ key, label, tint }));

const BY_KEY = new Map(ILLUSTRATIONS.map((i) => [i.key, i]));

export function illustrationUrl(key: string) {
  return `${ILLU_PREFIX}${key}`;
}

/** « illu:manette » → l'illustration, sinon null (vraie adresse d'image, ou rien). */
export function illustrationOf(imageUrl: string | null | undefined): Illustration | null {
  if (!imageUrl?.startsWith(ILLU_PREFIX)) return null;
  return BY_KEY.get(imageUrl.slice(ILLU_PREFIX.length)) ?? null;
}

export function isIllustrationUrl(v: string) {
  return illustrationOf(v) !== null;
}

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[-_/’]+/g, " ")
    .replace(/\s+/g, " ");

const MATCHERS = GUESS_ORDER.map((key) => {
  const def = DEFS.find((d) => d.key === key)!;
  const alt = def.words.map((w) => fold(w).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  return { key, re: new RegExp(`(^|[^a-z0-9])(${alt})(s|x)?(?![a-z0-9])`) };
});

/** Devine une illustration d'après le titre (et le site) : « Manette PS5 » → jeu-video. */
export function guessIllustration(title: string | null | undefined, site?: string | null): string | null {
  const t = fold(title ?? "");
  if (t.trim().length >= 3) {
    for (const m of MATCHERS) if (m.re.test(t)) return m.key;
  }
  if (site) {
    if (/decathlon/.test(site)) return "sport";
    if (/apple\.com/.test(site)) return "high-tech";
  }
  return null;
}

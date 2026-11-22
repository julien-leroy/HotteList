// Avatars illustrés : 64 personnages (public/avatars/01.webp … 64.webp, fond transparent)
// posés sur un fond de cercle choisi parmi les couleurs du site, des couleurs « fantaisie » et des dégradés.

export const AVATAR_COUNT = 64;
export const AVATAR_IDS = Array.from({ length: AVATAR_COUNT }, (_, i) => String(i + 1).padStart(2, "0"));

export function avatarSrc(id: string) {
  return `/avatars/${id}.webp`;
}

export function isAvatarId(v: unknown): v is string {
  return typeof v === "string" && /^\d{2}$/.test(v) && Number(v) >= 1 && Number(v) <= AVATAR_COUNT;
}

export type AvatarBackground = { key: string; name: string; css: string; group: "site" | "fantaisie" | "degrade" };

export const AVATAR_BACKGROUNDS: AvatarBackground[] = [
  // couleurs du site
  { key: "creme", name: "Crème", css: "#F7F1E3", group: "site" },
  { key: "or-pale", name: "Or pâle", css: "#F6E7C1", group: "site" },
  { key: "or", name: "Or", css: "#FFCB2E", group: "site" },
  { key: "sapin-pale", name: "Sapin pâle", css: "#E8F1EB", group: "site" },
  { key: "sapin", name: "Vert sapin", css: "#2A6B4B", group: "site" },
  { key: "rouge", name: "Rouge Noël", css: "#CF2B35", group: "site" },
  { key: "bordeaux", name: "Bordeaux", css: "#7E1621", group: "site" },
  { key: "sable", name: "Sable", css: "#E3D6BA", group: "site" },
  // couleurs fantaisie
  { key: "ciel", name: "Ciel d'hiver", css: "#CFE8F5", group: "fantaisie" },
  { key: "lavande", name: "Lavande", css: "#DCD3F5", group: "fantaisie" },
  { key: "rose", name: "Rose praline", css: "#F9D0DA", group: "fantaisie" },
  { key: "peche", name: "Pêche", css: "#FBD5B5", group: "fantaisie" },
  { key: "menthe", name: "Menthe", css: "#C9EBD6", group: "fantaisie" },
  { key: "nuit", name: "Bleu nuit", css: "#233656", group: "fantaisie" },
  // dégradés
  { key: "aurore", name: "Aurore", css: "linear-gradient(135deg, #FFD6E0, #FFE9A8)", group: "degrade" },
  { key: "givre", name: "Givre", css: "linear-gradient(160deg, #F2FAFF, #BFD3F5)", group: "degrade" },
  { key: "sapin-or", name: "Sapin doré", css: "linear-gradient(135deg, #2A6B4B, #D9A93E)", group: "degrade" },
  { key: "nuit-etoilee", name: "Nuit étoilée", css: "radial-gradient(circle at 30% 25%, #FFE9A8 0 2px, transparent 3px), radial-gradient(circle at 72% 40%, #FFFFFF 0 1.5px, transparent 2.5px), linear-gradient(160deg, #1E2A4A, #5B3F8C)", group: "degrade" },
  { key: "flamme", name: "Coin du feu", css: "linear-gradient(160deg, #FFB36B, #CF2B35)", group: "degrade" },
  { key: "menthe-ciel", name: "Menthe glacée", css: "linear-gradient(135deg, #C9EBD6, #BFE0F5)", group: "degrade" },
  { key: "sucre-orge", name: "Sucre d'orge", css: "repeating-linear-gradient(45deg, #FFFFFF 0 7px, #F6C9CC 7px 14px)", group: "degrade" },
];

export const DEFAULT_AVATAR_BG = "creme";

export function avatarBackground(key: string | null | undefined) {
  return (AVATAR_BACKGROUNDS.find((b) => b.key === key) ?? AVATAR_BACKGROUNDS[0]).css;
}

export function isAvatarBg(v: unknown): v is string {
  return typeof v === "string" && AVATAR_BACKGROUNDS.some((b) => b.key === v);
}

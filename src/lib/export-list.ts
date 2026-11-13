import "server-only";
import type { VisibleGift } from "./visibility";

/**
 * Données de l'export (PDF / Excel) de la page famille, vues par la personne qui télécharge :
 * mêmes règles que le site (sur sa propre liste, rien sur les réservations ; jamais les idées
 * des autres pour soi). Le serveur ne met dans le fichier que ce que `giftsVisibleTo` a laissé passer.
 */
export type ExportGift = {
  kind: "Souhait" | "Idée";
  ideaBy: string | null;
  title: string;
  price: string | null;
  favorite: boolean;
  status: string;
  site: string | null;
  url: string | null;
  description: string | null;
  comments: number;
};

export type ExportPerson = { name: string; realName: string; isMe: boolean; note: string | null; gifts: ExportGift[] };

export type ExportData = {
  familyName: string;
  event: string;
  exportedOn: string;
  people: ExportPerson[];
};

function statusLabel(g: VisibleGift): string {
  const s = g.secret;
  if (!s) return "";
  const names = s.participants.map((p) => p.firstName);
  if (s.takeMode === "AUCUN") return "Disponible";
  if (s.takeMode === "SEUL") return s.iParticipate ? "Réservé par vous" : `Réservé par ${names[0] ?? "quelqu'un"}`;
  return `À plusieurs : ${names.join(", ")}${s.iParticipate ? " (vous participez)" : ""}`;
}

export function exportGift(g: VisibleGift): ExportGift {
  return {
    kind: g.kind === "SOUHAIT" ? "Souhait" : "Idée",
    ideaBy: g.ideaBy?.firstName ?? null,
    title: g.title,
    price: g.price,
    favorite: g.favorite,
    status: statusLabel(g),
    site: g.siteOrigin,
    url: g.url,
    description: g.description,
    comments: g.secret?.comments.length ?? 0,
  };
}

/** Nom de fichier sans accents ni espaces : « HotteList - Famille Leroy.pdf » → hottelist-famille-leroy.pdf */
export function exportFileName(familyName: string, ext: string) {
  const base = familyName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `hottelist-${base || "famille"}.${ext}`;
}

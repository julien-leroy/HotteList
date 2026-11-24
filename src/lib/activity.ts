// Journal d'activité : une ligne courte par événement marquant (souhait, famille, arrivée),
// pour voir d'un coup d'œil quand le site sert. Rien d'autre, pour ne pas noyer les journaux.
//   [24/11/2026 16:15] souhait  « Casque audio sans fil » pour Maman · Famille Leroy
//   [24/11/2026 16:20] famille  « Famille Leroy » créée par Julien
//   [24/11/2026 16:22] arrivée  Sophie rejoint Famille Leroy (sans compte)

type Kind = "souhait" | "idée" | "famille" | "arrivée";

const STAMP = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/** Titre raccourci : la ligne reste sur une ligne. */
export function short(text: string, max = 50) {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

export function activityLine(kind: Kind, text: string, at = new Date()) {
  return `[${STAMP.format(at).replace(",", "")}] ${kind.padEnd(8)} ${text}`;
}

/** N'interrompt jamais l'action qui l'appelle. */
export function activity(kind: Kind, text: string) {
  try {
    console.info(activityLine(kind, text));
  } catch {}
}

// Mentions dans les commentaires. Format stocké : @[Prénom](idUtilisateur)
// Module pur, partagé entre le navigateur et le serveur.

export type Mentionable = { id: string; label: string };

const TOKEN = /@\[([^\]]{1,60})\]\(([a-z0-9]{10,40})\)/gi;

export function fold(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[\s'’-]/g, "");
}

/** Identifiants mentionnés dans un texte stocké. */
export function mentionIds(text: string) {
  return [...new Set([...text.matchAll(TOKEN)].map((m) => m[2]))];
}

/** Texte lisible (« @Michou ») pour les notifications et les e-mails. */
export function toPlain(text: string) {
  return text.replace(TOKEN, (_, label) => `@${label}`);
}

export type Segment = { text: string } | { mention: string; id: string };

/** Découpe un texte stocké en morceaux de texte et de mentions, pour l'affichage. */
export function segments(text: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    if (m.index! > last) out.push({ text: text.slice(last, m.index) });
    out.push({ mention: m[1], id: m[2] });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}

/**
 * Transforme ce qui a été tapé (« @Michou », « @papiMichou ») en mentions stockées,
 * pour les seules personnes autorisées. Comparaison sans accents, majuscules ni espaces.
 */
export function encodeMentions(raw: string, people: Mentionable[]) {
  const byFold = [...people].sort((a, b) => fold(b.label).length - fold(a.label).length);
  let out = "";
  let i = 0;
  while (i < raw.length) {
    const ch = raw[i];
    const prev = i === 0 ? " " : raw[i - 1];
    if (ch === "@" && /[\s(]/.test(prev)) {
      const rest = raw.slice(i + 1);
      let matched: { p: Mentionable; len: number } | null = null;
      for (const p of byFold) {
        const target = fold(p.label);
        // essaie les préfixes du texte qui suit pour retrouver le libellé (avec ou sans espaces)
        for (let len = 1; len <= Math.min(rest.length, p.label.length + 4); len++) {
          const piece = rest.slice(0, len);
          if (fold(piece) === target) {
            const next = rest[len];
            if (next === undefined || !/[\p{L}\p{N}]/u.test(next)) {
              matched = { p, len };
              break;
            }
          }
        }
        if (matched) break;
      }
      if (matched) {
        out += `@[${matched.p.label}](${matched.p.id})`;
        i += 1 + matched.len;
        continue;
      }
    }
    out += ch;
    i++;
  }
  return out;
}

/** Libellés uniques : prénom, ou prénom + initiale du nom quand deux personnes ont le même prénom. */
export function mentionLabels(people: { id: string; firstName: string; lastName: string | null }[]): Mentionable[] {
  const count = new Map<string, number>();
  for (const p of people) count.set(fold(p.firstName), (count.get(fold(p.firstName)) ?? 0) + 1);
  return people.map((p) => ({
    id: p.id,
    label: (count.get(fold(p.firstName)) ?? 0) > 1 && p.lastName ? `${p.firstName} ${p.lastName[0]}.` : p.firstName,
  }));
}

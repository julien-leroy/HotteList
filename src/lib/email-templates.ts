// Modèles des e-mails HotteList : HTML compatible messageries + version texte.
// Module pur (aucun accès serveur) : utilisé par le site et par scripts/rappels.ts.

export type CodePurpose = "VERIFY" | "LOGIN" | "RESET";

const COPY: Record<CodePurpose, { subject: string; title: string; intro: string; outro: string }> = {
  LOGIN: {
    subject: "Votre code de connexion HotteList",
    title: "Votre code de connexion",
    intro: "Voici le code pour vous connecter à HotteList :",
    outro: "Si vous n'avez pas demandé ce code, ignorez simplement cet e-mail : personne ne peut se connecter sans lui.",
  },
  VERIFY: {
    subject: "Confirmez votre adresse e-mail HotteList",
    title: "Confirmez votre adresse",
    intro: "Pour relier cette adresse à votre compte HotteList, saisissez ce code :",
    outro: "Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail : l'adresse ne sera pas ajoutée.",
  },
  RESET: {
    subject: "Réinitialisation de votre mot de passe HotteList",
    title: "Mot de passe oublié ?",
    intro: "Pas de panique. Saisissez ce code sur HotteList pour choisir un nouveau mot de passe :",
    outro: "Si vous n'avez rien demandé, ignorez cet e-mail : votre mot de passe actuel reste valable.",
  },
};

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Les deux (trois) e-mails types : même mise en page aux couleurs de HotteList, texte selon l'usage. */
export function renderCodeEmail(purpose: CodePurpose, firstName: string, code: string, minutes: number) {
  const c = COPY[purpose];
  const appUrl = (process.env.APP_URL ?? "").replace(/\/$/, "");
  const spaced = `${code.slice(0, 3)} ${code.slice(3)}`;
  const name = escapeHtml(firstName);
  const text = [
    `Bonjour ${firstName},`,
    "",
    c.intro,
    "",
    `    ${spaced}`,
    "",
    `Ce code est valable ${minutes} minutes et ne sert qu'une fois.`,
    c.outro,
    "",
    "— HotteList",
    appUrl,
  ].join("\n");

  const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${c.subject}</title></head>
<body style="margin:0;padding:0;background:#F7F1E3;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F1E3;padding:24px 12px;">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFDF7;border:1px solid #E3D6BA;border-radius:20px;overflow:hidden;">
    <tr><td style="background:#7E1621;padding:22px 28px;border-bottom:4px solid #D9A93E;">
      <span style="font-family:Georgia,'Times New Roman',serif;font-style:italic;font-weight:700;font-size:26px;color:#FFF9EE;">Hotte<span style="color:#F2C75C;">List</span></span>
    </td></tr>
    <tr><td style="padding:30px 28px 8px;font-family:Arial,Helvetica,sans-serif;color:#1F3A2C;">
      <h1 style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.2;color:#1F3A2C;">${c.title}</h1>
      <p style="margin:0 0 6px;font-size:16px;line-height:1.5;">Bonjour ${name},</p>
      <p style="margin:0 0 20px;font-size:16px;line-height:1.5;">${c.intro}</p>
    </td></tr>
    <tr><td align="center" style="padding:0 28px;">
      <div style="display:inline-block;padding:16px 28px;border-radius:14px;background:#F6E7C1;border:2px dashed #D9A93E;font-family:'Courier New',Courier,monospace;font-size:34px;font-weight:700;letter-spacing:6px;color:#5A1018;">${spaced}</div>
    </td></tr>
    <tr><td style="padding:20px 28px 28px;font-family:Arial,Helvetica,sans-serif;color:#5E5A48;font-size:14px;line-height:1.55;">
      <p style="margin:0 0 10px;">Ce code est valable <strong>${minutes} minutes</strong> et ne sert qu'une fois.</p>
      <p style="margin:0;">${c.outro}</p>
    </td></tr>
    <tr><td style="padding:14px 28px;background:#1F4D36;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#D8E8DE;">
      HotteList, les listes de Noël de toute la famille${appUrl ? ` · <a href="${appUrl}" style="color:#F2C75C;">${escapeHtml(appUrl.replace(/^https?:\/\//, ""))}</a>` : ""}
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
  return { subject: c.subject, text, html };
}


type ReminderLine = { name: string; free: number };

/** Rappel avant l'événement : souhaits encore libres, et ce qu'il me reste à acheter. */
export function renderReminderEmail(opts: {
  firstName: string;
  familyName: string;
  familyUrl: string;
  coursesUrl: string;
  days: number;
  dateLabel: string;
  lines: ReminderLine[];
  toBuy: number;
  settingsUrl: string;
}) {
  const { firstName, familyName, familyUrl, coursesUrl, days, dateLabel, lines, toBuy, settingsUrl } = opts;
  const free = lines.reduce((s, l) => s + l.free, 0);
  const when = days === 1 ? "demain" : `dans ${days} jours`;
  const subject = `${familyName} : c'est ${when} !`;
  const bullet = (l: ReminderLine) => `${l.name} : ${l.free} souhait${l.free > 1 ? "s" : ""} sans personne`;
  const text = [
    `Bonjour ${firstName},`,
    "",
    `L'événement de ${familyName} a lieu ${when} (${dateLabel}).`,
    free ? `${free} souhait${free > 1 ? "s attendent" : " attend"} encore quelqu'un :` : "Tous les souhaits ont trouvé quelqu'un. Bravo !",
    ...lines.filter((l) => l.free).map((l) => `  - ${bullet(l)}`),
    "",
    toBuy ? `Il vous reste ${toBuy} cadeau${toBuy > 1 ? "x" : ""} à acheter : ${coursesUrl}` : "",
    `Voir les listes : ${familyUrl}`,
    "",
    `Ne plus recevoir ces rappels : ${settingsUrl}`,
  ].filter((l, i, a) => l !== "" || a[i - 1] !== "").join("\n");

  const row = (l: ReminderLine) =>
    `<tr><td style="padding:6px 0;font-size:15px;color:#1F3A2C;">${escapeHtml(l.name)}</td><td align="right" style="padding:6px 0;"><span style="display:inline-block;padding:3px 10px;border-radius:999px;background:#F6DCDD;color:#7E1621;font-weight:700;font-size:13px;">${l.free} libre${l.free > 1 ? "s" : ""}</span></td></tr>`;
  const btn = (href: string, label: string, bg: string, fg: string) =>
    `<a href="${href}" style="display:inline-block;padding:12px 20px;margin:4px 6px 4px 0;border-radius:999px;background:${bg};color:${fg};font-weight:700;font-size:14px;text-decoration:none;">${label}</a>`;

  const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#F7F1E3;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F1E3;padding:24px 12px;"><tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFDF7;border:1px solid #E3D6BA;border-radius:20px;overflow:hidden;">
    <tr><td style="background:#7E1621;padding:22px 28px;border-bottom:4px solid #D9A93E;">
      <span style="font-family:Georgia,'Times New Roman',serif;font-style:italic;font-weight:700;font-size:26px;color:#FFF9EE;">Hotte<span style="color:#F2C75C;">List</span></span>
      <span style="float:right;margin-top:6px;padding:4px 12px;border-radius:999px;background:#F2C75C;color:#5A1018;font-family:Arial,sans-serif;font-weight:700;font-size:13px;">J-${days}</span>
    </td></tr>
    <tr><td style="padding:28px 28px 8px;font-family:Arial,Helvetica,sans-serif;color:#1F3A2C;">
      <h1 style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.2;">${escapeHtml(familyName)}, c'est ${when} !</h1>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">Bonjour ${escapeHtml(firstName)}, l'événement a lieu le <strong>${escapeHtml(dateLabel)}</strong>.</p>
      <p style="margin:0 0 8px;font-size:16px;line-height:1.5;">${free ? `<strong>${free} souhait${free > 1 ? "s attendent" : " attend"} encore quelqu'un :</strong>` : "Tous les souhaits ont trouvé quelqu'un. Bravo !"}</p>
      ${free ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:2px dotted #D9A93E;border-bottom:2px dotted #D9A93E;margin:6px 0 16px;">${lines.filter((l) => l.free).map(row).join("")}</table>` : ""}
      ${toBuy ? `<p style="margin:0 0 14px;font-size:15px;line-height:1.5;">Il vous reste <strong>${toBuy} cadeau${toBuy > 1 ? "x" : ""} à acheter</strong>.</p>` : ""}
      <p style="margin:0 0 22px;">${btn(familyUrl, "Voir les listes", "#B3202E", "#FFF9EE")}${toBuy ? btn(coursesUrl, "Ma liste de courses", "#F6E7C1", "#5C4214") : ""}</p>
    </td></tr>
    <tr><td style="padding:14px 28px;background:#1F4D36;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#D8E8DE;">
      Vous recevez ce rappel car votre adresse est confirmée sur HotteList. <a href="${settingsUrl}" style="color:#F2C75C;">Ne plus recevoir ces rappels</a>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
  return { subject, text, html };
}

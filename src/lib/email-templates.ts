// Modèles des e-mails HotteList : HTML compatible messageries + version texte.
// Module pur (aucun accès serveur) : utilisé par le site et par scripts/rappels.ts.

export type CodePurpose = "VERIFY" | "LOGIN" | "RESET" | "SIGNUP";

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
  SIGNUP: {
    subject: "Bienvenue sur HotteList : votre code de validation",
    title: "Bienvenue sur HotteList !",
    intro: "Il ne reste qu'une étape : saisissez ce code pour valider votre adresse et activer votre compte.",
    outro: "Si vous n'avez pas créé de compte sur HotteList, ignorez simplement cet e-mail : rien ne sera créé.",
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
  eventName: string;
  familyUrl: string;
  coursesUrl: string;
  days: number;
  dateLabel: string;
  lines: ReminderLine[];
  toBuy: number;
  settingsUrl: string;
}) {
  const { firstName, familyName, eventName, familyUrl, coursesUrl, days, dateLabel, lines, toBuy, settingsUrl } = opts;
  const free = lines.reduce((s, l) => s + l.free, 0);
  const when = days === 1 ? "demain" : `dans ${days} jours`;
  const subject = `${eventName} (${familyName}) : c'est ${when} !`;
  const bullet = (l: ReminderLine) => `${l.name} : ${l.free} souhait${l.free > 1 ? "s" : ""} sans personne`;
  const text = [
    `Bonjour ${firstName},`,
    "",
    `${eventName}, dans la famille ${familyName}, c'est ${when} (${dateLabel}).`,
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
      <h1 style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.2;">${escapeHtml(eventName)}, c'est ${when} !</h1>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">Bonjour ${escapeHtml(firstName)}, rendez-vous le <strong>${escapeHtml(dateLabel)}</strong> dans la famille <strong>${escapeHtml(familyName)}</strong>.</p>
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

/** « X vous a mentionné » : le cadeau et le commentaire mis en avant. */
export function renderMentionEmail(o: {
  firstName: string;
  author: string;
  comment: string; // texte lisible, mentions en « @Prénom »
  meLabel: string;
  /** libellés mentionnés dans ce commentaire, pour les mettre en valeur */
  labels: string[];
  gift: { title: string; price: string | null; imageUrl: string | null; siteOrigin: string | null };
  recipientName: string;
  familyName: string;
  giftUrl: string;
  settingsUrl: string;
}) {
  const subject = `${o.author} vous a mentionné à propos de « ${o.gift.title} »`;
  const price = o.gift.price ? (/^\d+([.,]\d{1,2})?$/.test(o.gift.price.trim()) ? `${o.gift.price.trim().replace(".", ",")} €` : o.gift.price) : "Prix libre";
  const text = [
    `Bonjour ${o.firstName},`,
    "",
    `${o.author} vous a mentionné dans un commentaire sur « ${o.gift.title} » (pour ${o.recipientName}, famille ${o.familyName}) :`,
    "",
    ...o.comment.split("\n").map((l) => `  > ${l}`),
    "",
    `Voir le cadeau et répondre : ${o.giftUrl}`,
    "",
    `${o.recipientName} ne voit pas les commentaires de ses cadeaux : la surprise est préservée.`,
    `Ne plus recevoir ces e-mails : ${o.settingsUrl}`,
  ].join("\n");

  // Mentions en gras doré ; la mienne encore plus visible
  let commentHtml = escapeHtml(o.comment).replace(/\n/g, "<br>");
  const labels = [...new Set(o.labels)].sort((a, b) => b.length - a.length);
  if (labels.length) {
    const alt = labels.map((l) => escapeHtml(l).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
    commentHtml = commentHtml.replace(new RegExp(`@(${alt})`, "g"), (_, label) =>
      label === escapeHtml(o.meLabel)
        ? `<span style="background:#F2C75C;color:#5A1018;font-weight:700;padding:1px 6px;border-radius:6px;">@${label}</span>`
        : `<span style="color:#8A1C26;font-weight:700;">@${label}</span>`,
    );
  }
  const img =
    o.gift.imageUrl && /^https?:\/\//.test(o.gift.imageUrl)
      ? `<img src="${escapeHtml(o.gift.imageUrl)}" width="96" height="96" alt="" style="display:block;width:96px;height:96px;object-fit:contain;border-radius:12px;background:#fff;border:1px solid #E3D6BA;">`
      : `<div style="width:96px;height:96px;border-radius:12px;background:#F6E7C1;text-align:center;line-height:96px;font-size:44px;">🎁</div>`;

  const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#F7F1E3;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F1E3;padding:24px 12px;"><tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;background:#FFFDF7;border:1px solid #E3D6BA;border-radius:20px;overflow:hidden;">
    <tr><td style="background:#7E1621;padding:20px 28px;border-bottom:4px solid #D9A93E;">
      <span style="font-family:Georgia,'Times New Roman',serif;font-style:italic;font-weight:700;font-size:26px;color:#FFF9EE;">Hotte<span style="color:#F2C75C;">List</span></span>
    </td></tr>
    <tr><td style="padding:26px 28px 6px;font-family:Arial,Helvetica,sans-serif;color:#1F3A2C;">
      <h1 style="margin:0 0 8px;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.25;">${escapeHtml(o.author)} vous a mentionné</h1>
      <p style="margin:0 0 18px;font-size:15px;line-height:1.5;color:#5E5A48;">Bonjour ${escapeHtml(o.firstName)}, on a besoin de vous sur ce cadeau.</p>
    </td></tr>
    <tr><td style="padding:0 28px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF9EE;border:1px solid #E3D6BA;border-radius:16px;">
        <tr>
          <td width="112" style="padding:14px 0 14px 14px;vertical-align:top;">${img}</td>
          <td style="padding:14px 16px;vertical-align:top;font-family:Arial,Helvetica,sans-serif;">
            <div style="font-size:12px;font-weight:700;color:#8A6516;text-transform:uppercase;letter-spacing:.04em;">Pour ${escapeHtml(o.recipientName)} · ${escapeHtml(o.familyName)}</div>
            <div style="margin:6px 0 8px;font-family:Georgia,'Times New Roman',serif;font-size:19px;font-weight:700;color:#1F3A2C;line-height:1.25;">${escapeHtml(o.gift.title)}</div>
            <span style="display:inline-block;padding:3px 10px;border-radius:6px 999px 999px 6px;background:#F6E7C1;color:#5C4214;font-weight:700;font-size:13px;">${escapeHtml(price)}</span>
            ${o.gift.siteOrigin ? `<span style="font-size:12px;color:#6B6553;margin-left:6px;">${escapeHtml(o.gift.siteOrigin)}</span>` : ""}
          </td>
        </tr>
      </table>
    </td></tr>
    <tr><td style="padding:18px 28px 6px;font-family:Arial,Helvetica,sans-serif;">
      <div style="font-size:13px;font-weight:700;color:#1F3A2C;margin-bottom:8px;">💬 ${escapeHtml(o.author)} a écrit :</div>
      <div style="padding:14px 16px;border-left:5px solid #D9A93E;background:#FBF4E4;border-radius:4px 14px 14px 4px;font-size:16px;line-height:1.55;color:#1F3A2C;">${commentHtml}</div>
    </td></tr>
    <tr><td style="padding:20px 28px 26px;font-family:Arial,Helvetica,sans-serif;">
      <a href="${o.giftUrl}" style="display:inline-block;padding:13px 22px;border-radius:999px;background:#B3202E;color:#FFF9EE;font-weight:700;font-size:15px;text-decoration:none;">Voir le cadeau et répondre</a>
      <p style="margin:16px 0 0;font-size:13px;color:#6B6553;line-height:1.5;">🤫 ${escapeHtml(o.recipientName)} ne voit pas les commentaires de ses cadeaux : la surprise est préservée.</p>
    </td></tr>
    <tr><td style="padding:14px 28px;background:#1F4D36;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#D8E8DE;">
      Vous recevez cet e-mail car quelqu'un vous a mentionné sur HotteList. <a href="${o.settingsUrl}" style="color:#F2C75C;">Ne plus recevoir ces e-mails</a>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
  return { subject, text, html };
}

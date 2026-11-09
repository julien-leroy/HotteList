import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

// Envoi d'e-mails par le SMTP d'Amen (ou tout autre SMTP), jamais depuis le serveur maison.
// Sans SMTP_HOST dans .env, tout ce qui concerne l'e-mail est simplement masqué du site.

export function mailEnabled() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

let transporter: Transporter | null = null;

function transport() {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 465);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465, // 465 : TLS direct ; 587 : STARTTLS
      requireTLS: port !== 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
  }
  return transporter;
}

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

export async function sendCodeEmail(to: string, purpose: CodePurpose, firstName: string, code: string, minutes: number) {
  const { subject, text, html } = renderCodeEmail(purpose, firstName, code, minutes);
  await transport().sendMail({
    from: process.env.MAIL_FROM || `HotteList <${process.env.SMTP_USER}>`,
    to,
    subject,
    text,
    html,
  });
}

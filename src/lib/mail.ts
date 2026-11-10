import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { renderCodeEmail, renderMentionEmail, type CodePurpose } from "./email-templates";
export type { CodePurpose };

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

export async function sendMentionEmail(to: string, data: Parameters<typeof renderMentionEmail>[0]) {
  const { subject, text, html } = renderMentionEmail(data);
  await transport().sendMail({ from: process.env.MAIL_FROM || `HotteList <${process.env.SMTP_USER}>`, to, subject, text, html });
}

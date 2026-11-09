// Vérifie la configuration SMTP du .env et envoie un e-mail d'essai.
// Usage : npm run test-mail -- vous@exemple.fr
import nodemailer from "nodemailer";

async function main() {
  const to = process.argv[2];
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.error("SMTP_HOST, SMTP_USER et SMTP_PASS doivent être renseignés dans .env");
    process.exit(1);
  }
  const port = Number(SMTP_PORT || 465);
  const t = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    connectionTimeout: 10_000,
  });
  process.stdout.write(`Connexion à ${SMTP_HOST}:${port} en tant que ${SMTP_USER}… `);
  await t.verify();
  console.log("OK");
  if (!to) {
    console.log("Ajoutez une adresse pour envoyer un e-mail d'essai : npm run test-mail -- vous@exemple.fr");
    return;
  }
  const info = await t.sendMail({
    from: MAIL_FROM || `HotteList <${SMTP_USER}>`,
    to,
    subject: "Test HotteList",
    text: "Si vous lisez ceci, l'envoi d'e-mails de HotteList fonctionne. Vérifiez aussi qu'il n'est pas arrivé dans les spams.",
  });
  console.log(`E-mail d'essai envoyé à ${to} (${info.response}).`);
}

main().catch((e) => {
  console.error("\nÉchec :", e instanceof Error ? e.message : e);
  process.exit(1);
});

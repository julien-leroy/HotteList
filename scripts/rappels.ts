// Rappel par e-mail avant l'événement de chaque famille (J-7 par défaut).
// À lancer une fois par jour par cron : npm run rappels
// Options : --dry (affiche sans envoyer), --jours=7
import { PrismaClient } from "@prisma/client";
import nodemailer from "nodemailer";
import { renderReminderEmail } from "../src/lib/email-templates";

const db = new PrismaClient();
const DRY = process.argv.includes("--dry");
const DAYS = Number(process.argv.find((a) => a.startsWith("--jours="))?.split("=")[1] ?? 7);

const parisDay = (d: Date) => new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(d);
const daysUntil = (d: Date) => Math.round((Date.parse(parisDay(d)) - Date.parse(parisDay(new Date()))) / 86_400_000);

async function main() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM, APP_URL } = process.env;
  if (!DRY && (!SMTP_HOST || !SMTP_USER || !SMTP_PASS)) {
    console.log("SMTP non configuré : aucun rappel envoyé.");
    return;
  }
  const port = Number(SMTP_PORT || 465);
  const transport = DRY
    ? null
    : nodemailer.createTransport({ host: SMTP_HOST, port, secure: port === 465, requireTLS: port !== 465, auth: { user: SMTP_USER, pass: SMTP_PASS } });
  const base = (APP_URL ?? "").replace(/\/$/, "");

  const families = await db.family.findMany({
    include: { memberships: { include: { user: true } } },
  });
  let sent = 0;
  for (const family of families) {
    const days = daysUntil(family.eventDate);
    const eventKey = parisDay(family.eventDate);
    // Fenêtre de J-DAYS à J-1 : si le cron a raté un jour, le rappel part le lendemain. Une seule fois par événement.
    if (days < 1 || days > DAYS || family.reminderSentFor === eventKey) continue;

    const gifts = await db.gift.findMany({
      where: { familyId: family.id, archivedAt: null, deletedAt: null },
      include: { participants: { select: { userId: true, status: true } } },
    });
    const memberIds = new Set(family.memberships.map((m) => m.userId));
    const dateLabel = family.eventDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" });

    for (const m of family.memberships) {
      const u = m.user;
      if (u.managedById || !u.email || !u.emailVerifiedAt || !u.emailReminders) continue;
      // Souhaits libres des AUTRES membres (jamais d'information sur sa propre liste)
      const lines = family.memberships
        .filter((o) => o.userId !== u.id && memberIds.has(o.userId))
        .map((o) => ({
          name: o.user.firstName,
          free: gifts.filter((g) => g.recipientId === o.userId && g.takeMode === "AUCUN" && g.kind === "SOUHAIT").length,
        }))
        .filter((l) => l.free > 0);
      const toBuy = gifts.filter((g) => g.participants.some((p) => p.userId === u.id && p.status === "A_ACHETER")).length;
      if (!lines.length && !toBuy) continue;

      const mail = renderReminderEmail({
        firstName: u.firstName,
        familyName: family.name,
        eventName: family.eventName,
        familyUrl: `${base}/f/${family.slug}`,
        coursesUrl: `${base}/courses`,
        settingsUrl: `${base}/profil#compte`,
        days,
        dateLabel,
        lines,
        toBuy,
      });
      if (DRY) {
        console.log(`--- ${u.email} · ${mail.subject}\n${mail.text}\n`);
      } else {
        try {
          await transport!.sendMail({ from: MAIL_FROM || `HotteList <${SMTP_USER}>`, to: u.email, ...mail });
          sent++;
        } catch (e) {
          console.error(`Échec pour ${u.email} :`, e instanceof Error ? e.message : e);
        }
      }
    }
    if (!DRY) await db.family.update({ where: { id: family.id }, data: { reminderSentFor: eventKey } });
  }
  console.log(DRY ? "Simulation terminée (rien envoyé)." : `${sent} rappel(s) envoyé(s).`);
}

main().finally(() => db.$disconnect());

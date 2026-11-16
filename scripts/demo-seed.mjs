/**
 * Remplit la base de démonstration (data/demo.db) pour une vidéo ou une présentation.
 * Lancé par deploy/demo.sh, avec DATABASE_URL qui pointe vers la base de démo : la vraie base
 * n'est jamais ouverte. Tous les comptes ont le mot de passe « noel2026 ».
 */
import { PrismaClient } from "@prisma/client";
import { randomBytes, scrypt as scryptCb } from "node:crypto";
import { promisify } from "node:util";

if (!/demo\.db/.test(process.env.DATABASE_URL ?? "")) {
  console.error("Sécurité : ce script ne s'utilise que sur la base de démo (DATABASE_URL doit pointer vers demo.db).");
  process.exit(1);
}

const db = new PrismaClient();
const scrypt = promisify(scryptCb);
const PASSWORD = "noel2026";
const salt = randomBytes(16);
const h = await scrypt(PASSWORD, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
const passwordHash = `scrypt$16384$8$1$${salt.toString("base64")}$${h.toString("base64")}`;

const day = 864e5;
const ago = (days) => new Date(Date.now() - days * day);

// --- Personnes -----------------------------------------------------------------------------
const user = (firstName, lastName, login, avatarColor, extra = {}) =>
  db.user.create({ data: { firstName, lastName, login, passwordHash: login ? passwordHash : null, avatarColor, createdAt: ago(20), ...extra } });

const julien = await user("Julien", "Leroy", "julien", "#1F4D36");
const dominique = await user("Dominique", "Leroy", "maman", "#B3202E");
const bernard = await user("Bernard", "Leroy", "papa", "#5F8FB3");
const claire = await user("Claire", "Martin", "claire", "#D9A93E");
const thomas = await user("Thomas", "Martin", "thomas", "#7A5BA8");
const lea = await user("Léa", "Martin", null, "#E07A5F", { managedById: claire.id });
const hugo = await user("Hugo", "Martin", null, "#3F7A52", { managedById: claire.id });
const sarah = await user("Sarah", "Benali", "sarah", "#C2185B");
const mehdi = await user("Mehdi", "Haddad", "mehdi", "#00838F");
const antoine = await user("Antoine", "Petit", "antoine", "#8D6E63");

// --- Familles ------------------------------------------------------------------------------
const leroy = await db.family.create({
  data: { name: "Famille Leroy", slug: "famille-leroy", createdById: julien.id, eventName: "Noël", eventDate: new Date("2026-12-25T00:00:00+01:00"), santaMode: true },
});
const copains = await db.family.create({
  data: { name: "Les copains", slug: "les-copains", createdById: julien.id, eventName: "Noël entre amis", eventDate: new Date("2026-12-19T00:00:00+01:00") },
});

const member = (u, f, role = "MEMBRE", nickname = null) =>
  db.membership.create({ data: { userId: u.id, familyId: f.id, role, nickname, joinedAt: ago(15), lastSeenAt: ago(2), prevSeenAt: ago(3) } });
await member(julien, leroy, "ADMIN");
await member(dominique, leroy, "MEMBRE", "Maman");
await member(bernard, leroy, "MEMBRE", "Papa");
await member(claire, leroy, "ADMIN");
await member(thomas, leroy);
await member(lea, leroy);
await member(hugo, leroy);
for (const [u, role] of [[julien, "ADMIN"], [sarah, "MEMBRE"], [mehdi, "MEMBRE"], [antoine, "MEMBRE"]]) await member(u, copains, role);

// --- Cadeaux -------------------------------------------------------------------------------
let pos = 0;
const gift = (family, recipient, author, title, price, extra = {}) =>
  db.gift.create({
    data: {
      familyId: family.id,
      recipientId: recipient.id,
      createdById: author.id,
      kind: extra.kind ?? "SOUHAIT",
      title,
      price,
      description: extra.description ?? null,
      url: extra.url ?? null,
      siteOrigin: extra.url ? new URL(extra.url).hostname.replace(/^www\./, "") : null,
      favorite: extra.favorite ?? false,
      takeMode: extra.takeMode ?? "AUCUN",
      position: pos++,
      createdAt: extra.createdAt ?? ago(10),
      contentUpdatedAt: extra.createdAt ?? ago(10),
    },
  });
const take = (g, ...people) => Promise.all(people.map((u, i) => db.giftParticipant.create({ data: { giftId: g.id, userId: u.id, status: i === 0 ? "ACHETE" : "A_ACHETER" } })));
const comment = (g, author, text, daysAgo = 1) => db.comment.create({ data: { giftId: g.id, authorId: author.id, text, createdAt: ago(daysAgo) } });
const at = (u) => `@[${u === dominique ? "Maman" : u === bernard ? "Papa" : u.firstName}](${u.id})`;

// Maman
const pull = await gift(leroy, dominique, dominique, "Pull en laine mérinos, vert sapin", "79 €", {
  favorite: true,
  url: "https://www.laboutiquedupull.fr/pull-merinos-vert",
  description: "Taille M, col rond. Vert sapin de préférence, sinon bleu nuit. Il me faut un pull bien chaud pour les balades du dimanche.",
});
const the = await gift(leroy, dominique, dominique, "Coffret de thés de Noël", "32 €", { url: "https://www.palaisdesthes.com/coffret-noel", takeMode: "SEUL" });
await take(the, claire);
const casque = await gift(leroy, dominique, dominique, "Casque sans fil à réduction de bruit", "249 €", {
  url: "https://www.fnac.com/casque-reduction-de-bruit",
  takeMode: "A_PLUSIEURS",
  description: "Pour le train et les longues soirées de lecture. Le modèle noir, pas le blanc.",
});
await take(casque, thomas, bernard);
await comment(casque, thomas, `On se le partage à trois avec ${at(bernard)} ? Ça fait 83 € chacun.`, 2);
await comment(casque, bernard, "Bonne idée, je m'occupe de la commande la semaine prochaine.", 1);
await gift(leroy, dominique, claire, "Atelier poterie à deux", "60 €", { kind: "IDEE", description: "Un samedi matin, à l'atelier du centre-ville. Elle en parle depuis l'été !" });
await gift(leroy, dominique, dominique, "Livre « La cuisine de nos grands-mères »", "29 €", { url: "https://www.decitre.fr/cuisine-grands-meres", createdAt: ago(1) });

// Papa
const velo = await gift(leroy, bernard, bernard, "Compteur GPS pour le vélo", "129 €", {
  favorite: true,
  url: "https://www.decathlon.fr/compteur-gps-velo",
  description: "Avec l'écran couleur et la navigation. Compatible avec mon support actuel si possible.",
});
await gift(leroy, bernard, bernard, "Gants de vélo d'hiver, taille L", "35 €", { url: "https://www.decathlon.fr/gants-hiver" });
await gift(leroy, bernard, bernard, "Abonnement à un magazine de jardinage", "45 €");
await comment(velo, claire, `${at(julien)} tu sais s'il a un support Garmin ou autre ?`, 1);

// Claire et Thomas
await gift(leroy, claire, claire, "Bougie parfumée cannelle et orange", "19 €", { url: "https://www.maisonsdumonde.com/bougie-cannelle" });
await gift(leroy, claire, claire, "Roman graphique « Les Saisons »", "24,90 €", {
  favorite: true,
  url: "https://www.decitre.fr/les-saisons",
  description: "Le tome 2 ! J'ai déjà le premier.",
});
await gift(leroy, thomas, thomas, "Jeu de société « Les Aventuriers du Rail »", "45 €", { url: "https://www.philibertnet.com/aventuriers-du-rail", createdAt: ago(1) });
await gift(leroy, thomas, thomas, "Couteau de cuisine japonais", "89 €", { description: "Lame de 20 cm, pour la cuisine du dimanche." });

// Les enfants (comptes gérés par Claire)
const chateau = await gift(leroy, lea, claire, "Château de princesse en bois", "45 €", {
  favorite: true,
  url: "https://www.oxybul.com/chateau-bois",
  description: "Elle adore les figurines, celui-ci est livré avec 4 personnages.",
});
await take(chateau, dominique);
await gift(leroy, lea, claire, "Coffret de perles à bijoux", "22 €", { url: "https://www.oxybul.com/perles" });
// Hugo n'a encore rien : sa liste passe à la fin

// Julien
await gift(leroy, julien, julien, "Enceinte de voyage étanche", "59 €", { url: "https://www.fnac.com/enceinte-voyage" });
await gift(leroy, julien, julien, "Cours de pâtisserie", "75 €", { description: "Plutôt les entremets ou les macarons." });
await gift(leroy, julien, claire, "Plaid en laine", "49 €", { kind: "IDEE" });

// Les copains
pos = 0;
await gift(copains, sarah, sarah, "Carnet de voyage en cuir", "28 €", { url: "https://www.etsy.com/carnet-cuir" });
await gift(copains, mehdi, mehdi, "Moka italienne 6 tasses", "39 €", { favorite: true });
await gift(copains, antoine, antoine, "Bonnet en laine", "25 €");

// --- Secret Santa de la famille Leroy -------------------------------------------------------
// Julien n'a pas encore cliqué sur « Découvrir » : idéal pour montrer l'animation.
const santa = await db.secretSanta.create({ data: { familyId: leroy.id, createdById: julien.id, budget: "30 €", createdAt: ago(3) } });
const circle = [julien, dominique, claire, thomas, bernard];
for (let i = 0; i < circle.length; i++) {
  await db.secretSantaAssignment.create({
    data: { santaId: santa.id, giverId: circle[i].id, receiverId: circle[(i + 1) % circle.length].id, revealedAt: circle[i] === julien ? null : ago(2) },
  });
}

// --- Notifications de Julien ---------------------------------------------------------------
await db.notification.createMany({
  data: [
    { userId: julien.id, text: "Secret Santa dans Famille Leroy : cliquez sur « Découvrir » pour savoir à qui vous offrez un cadeau !", link: `/f/${leroy.slug}`, createdAt: ago(3) },
    { userId: julien.id, text: "Claire vous a mentionné sur « Compteur GPS pour le vélo » pour Papa : tu sais s'il a un support Garmin ou autre ?", link: `/f/${leroy.slug}?cadeau=${velo.id}`, createdAt: ago(1) },
  ],
});

const [nu, ng] = [await db.user.count(), await db.gift.count()];
await db.$disconnect();
console.log(`  Base de démo prête : 2 familles, ${nu} personnes, ${ng} cadeaux, un Secret Santa à découvrir.`);

# HotteList — architecture technique (version simplifiée)

_Document de référence. Dernière mise à jour : 9 novembre 2026 (e-mails)._
_Développement lancé le 9 novembre 2026. Ajout de souhait et d'idée en popup depuis la v1.1. Code : https://github.com/julien-leroy/HotteList_

## 1. Décisions prises

| Sujet | Décision |
|---|---|
| Nom | **HotteList** |
| Public | Amis et familles de Julien (petit volume) |
| Inscription | **Ouverte** : n'importe qui arrivant sur le site peut créer un compte puis créer ses propres familles |
| Hébergement | Serveur Debian perso à la maison : x86, 8 Go de RAM, IP fixe. Passage sur VPS possible plus tard |
| Node.js | **24**, installé avec nvm (`.nvmrc` dans le dépôt) |
| Adresse | `hottelist.julienfluenceur.online` (DNS hors Cloudflare : un simple enregistrement A suffit) |
| Reverse proxy | **Caddy**, déjà en place sur le serveur pour les autres projets |
| Port de l'application | **9000** |
| Simplicité | **Pas de Docker**, **SQLite** |
| E-mails | **Facultatifs**, par le SMTP d'Amen (`noreply@julienfluenceur.online`) : connexion par code, mot de passe oublié, confirmation d'adresse. Jamais envoyés depuis le serveur maison |
| Images | **Aucune image stockée sur le serveur** : on enregistre seulement l'adresse de l'image trouvée dans le lien, et le navigateur l'affiche directement depuis le site d'origine |
| Listes | Une liste par famille. Sur le profil, ma liste pour chaque famille ; glisser-déposer pour **déplacer** ou **copier** un souhait vers une autre famille, et pour changer l'ordre |
| Cadeau à plusieurs | On indique seulement qu'on participe (pas de montant). Les détails se règlent en commentaire |
| Comptes gérés | Un adulte crée et administre des comptes « en procuration » (ex. ses enfants) et voit tout sur leurs listes |
| Fin de l'événement | Un encart « L'événement est terminé » avec un bouton **« Nettoyer les listes »** : il archive tous les cadeaux réservés ou à plusieurs, et laisse sur les listes ceux qui n'ont pas été offerts |
| DA | Festive : rouge profond, vert sapin, or ; Fraunces + Inter ; boutons ghost aux couleurs douces (cf. canvas de design) |
| Favicon | Cadeau doré au trait sur fond bordeaux pointillé (`src/app/icon.svg`, `apple-icon.png` pour l'écran d'accueil des téléphones) |

## 2. Vue d'ensemble

Une seule application **Next.js (TypeScript)** lancée par Node.js sur le port 9000. La base tient dans **un seul fichier SQLite**.

```
Internet ─► Caddy (HTTPS, hottelist.julienfluenceur.online) ─► Node.js : HotteList (127.0.0.1:9000)
                                                                 └─► data/hottelist.db (SQLite)
Navigateur ─► images affichées directement depuis le site marchand (amazon.fr, fnac.com…)
```

Tout le site tient dans un dossier, `/opt/hottelist`. Pour sauvegarder, il suffit de copier `data/`.

## 3. Bibliothèques

| Besoin | Choix | Remarque |
|---|---|---|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript | Pages et logique serveur (actions serveur) au même endroit |
| Base de données | **SQLite** (mode WAL) | Un fichier, rien à installer |
| Accès BDD | Prisma 6 | Fonctionne avec SQLite ; on pourra basculer sur PostgreSQL plus tard |
| Authentification | **Maison, minimale** : mots de passe hachés avec scrypt (intégré à Node), sessions en base, cookie httpOnly | Better Auth écarté : il impose une adresse e-mail par utilisateur, incompatible avec les comptes gérés sans identifiant |
| Validation | Zod | |
| E-mails | Nodemailer (SMTP Amen) | Activés seulement si `SMTP_*` est renseigné dans `.env` |
| Styles | Tailwind CSS 4 (tokens de la DA) + classes reprises du canvas de design | |
| Popup, menus | Radix UI (Dialog, DropdownMenu) | Accessible au clavier |
| Glisser-déposer | dnd-kit | Souris, tactile (appui long), clavier |
| Polices | @fontsource-variable (Fraunces, Inter) | Auto-hébergées : aucune requête vers Google |
| Lecture des liens | cheerio + requête HTTP maison | Lit seulement la page HTML (Open Graph, JSON-LD, balises Amazon) |
| Lancement | **systemd** (service Debian, Node via nvm) | Redémarre tout seul |
| Tests | Vitest | Règles de visibilité, blocage réseau local, lecture des pages produit |

Supprimés : Docker, PostgreSQL, sharp et stockage d'images, Better Auth.

## 4. Images des cadeaux

- Quand on colle un lien, le serveur lit **uniquement la page HTML** de l'article (balises `og:image`, `og:title`, prix si présent, données JSON-LD `Product`) et renvoie l'**adresse** de l'image. Rien n'est téléchargé ni gardé à part cette adresse.
- La carte affiche l'image directement depuis le site d'origine (`<img referrerpolicy="no-referrer" loading="lazy">`).
- Si aucune image n'est trouvée, si Amazon bloque la lecture, ou si l'image ne charge plus un jour, la carte affiche une **illustration par défaut** dans la DA.
- Secours manuel : bouton « Choisir l'image moi-même », qui ouvre un champ « Adresse de l'image ».
- Sécurité de la lecture des liens : délai de 7 s, 2 Mo maximum, 4 redirections, ports 80/443 seulement, et **blocage des adresses du réseau local vérifié au moment même de la connexion** (y compris après redirection ou résolution DNS piégée). Limite de 30 lectures par 10 min et par utilisateur.

## 5. Comptes

- **Inscription ouverte** : prénom, nom facultatif, identifiant (e-mail ou pseudo) et mot de passe de 8 caractères minimum, sans vérification d'adresse.
- **Rejoindre une famille** : uniquement via son lien. Un visiteur qui s'inscrit depuis ce lien rejoint la famille directement. S'il se connecte, il confirme d'un clic, en cochant au passage ses comptes gérés à ajouter.
- **Adresse e-mail (facultative)** : ajoutée dans « Mon profil → Mon compte » et enregistrée **seulement une fois confirmée** par un code. Tant qu'elle n'est pas confirmée, elle n'est pas réservée : personne ne peut bloquer l'adresse de quelqu'un d'autre. Une adresse confirmée sert aussi d'identifiant de connexion.
- **Codes par e-mail** : 6 chiffres, valables 10 minutes, 5 essais, à usage unique (un nouveau code annule le précédent), seule l'empreinte HMAC est stockée. Limites : 3 codes / 15 min par adresse, 10 / h par IP. Pour la connexion par code et le mot de passe oublié, la réponse est toujours la même, que l'adresse ait un compte ou non.
- **Connexion par code** (`/connexion-code`) : en option, à côté du mot de passe, jamais obligatoire.
- **Mot de passe oublié** :
  - par e-mail (`/mot-de-passe-oublie`) : code + nouveau mot de passe ; toutes les autres sessions sont fermées ;
  - **n'importe quel membre** de la famille génère, depuis « Membres », un **lien de réinitialisation à usage unique**, valable 24 h, et l'envoie lui-même par SMS ou WhatsApp ;
  - Julien peut aussi lancer `npm run reset-password -- <identifiant>` sur le serveur.
- **Comptes gérés** (enfants) : ni identifiant ni mot de passe, ils n'existent qu'à travers leur gestionnaire. Le bouton **« Lui donner un accès »** les rend autonomes (identifiant + mot de passe provisoire) ; le gestionnaire ne les gère alors plus.
- **Sécurité minimale** : mots de passe hachés (scrypt), seule l'empreinte HMAC des jetons de session et de réinitialisation est stockée, limite de tentatives de connexion (20 / 15 min par IP, 8 par identifiant) et d'inscriptions (5 / h par IP), cookies `httpOnly`, `SameSite=Lax`, `Secure` en HTTPS. Redirections après connexion limitées aux pages du site.

## 6. Fin de l'événement : « Nettoyer les listes »

- Chaque famille a une **date d'événement**, le 25 décembre par défaut, modifiable par l'admin.
- Le lendemain de cette date (heure de Paris), la page famille affiche en haut un encart vert sapin et or : « L'événement est terminé ! Merci à tous », avec un récapitulatif « 18 cadeaux offerts · 13 encore sur les listes ».
- Le bouton **« Nettoyer les listes »** n'apparaît que pour les **admins** et ouvre d'abord une confirmation détaillée.
- **Effet** : les cadeaux réservés seuls ou à plusieurs reçoivent `archivedAt` et `archiveYear` et disparaissent des listes ; les autres restent avec leurs commentaires ; rien n'est supprimé.
- Après nettoyage, l'encart devient « Les listes sont prêtes pour la suite » et invite l'admin à choisir la date du prochain événement.

## 7. Modèle de données

Les noms dans le code sont en anglais (`prisma/schema.prisma`).

```
User           id, firstName, lastName?, login? (unique, vide pour un compte géré), passwordHash?, avatarColor, managedById?, email? (unique), emailVerifiedAt?
Session        id (empreinte du jeton), userId, expiresAt
Family         id, name, slug unique avec suffixe aléatoire (ex. famille-leroy-7kq2), createdById, eventDate
Membership     userId, familyId, role (ADMIN | MEMBRE), joinedAt          — unique (userId, familyId)
Gift           id, familyId, recipientId, createdById, kind (SOUHAIT | IDEE),
               title, description?, url?, price?, imageUrl?, siteOrigin?, favorite, position,
               takeMode (AUCUN | SEUL | A_PLUSIEURS), contentUpdatedAt, archivedAt?, archiveYear?
GiftParticipant giftId, userId, createdAt
Comment        id, giftId, authorId, text, createdAt
PasswordResetToken id (empreinte), userId, expiresAt, usedAt?
EmailCode      id, userId, email, purpose (VERIFY | LOGIN | RESET), codeHash, attempts, expiresAt, usedAt?
Notification   id, userId, text, link?, readAt?        — ex. « souhait déplacé », « souhait retiré »
```

`contentUpdatedAt` ne bouge que si le titre, le lien, le prix ou la description changent : c'est ce qui déclenche « modifié depuis votre réservation ».

## 8. Règles de visibilité et de droits (le cœur du projet)

Toutes les lectures passent par `giftsVisibleTo(viewer, gifts)` (`src/lib/visibility.ts`, module pur couvert par les tests). Les données cachées ne sont **jamais envoyées** au navigateur. Les cadeaux archivés sont exclus.

- **Je suis le destinataire** : je ne vois que mes SOUHAITS, sans participants, sans statut, sans commentaires. Les IDÉES ajoutées pour moi n'existent pas pour moi.
- **Je suis le gestionnaire du destinataire** : je vois tout, y compris les idées des autres, et je peux créer, modifier, supprimer, déplacer et copier ses SOUHAITS.
- **Autre membre** : je vois tout ; je peux réserver, participer, commenter et ajouter des idées.

Droits d'écriture vérifiés côté serveur, dans chaque action :
- Réserver, participer, commenter : interdit sur un cadeau dont je suis le destinataire.
- Modifier ou supprimer un SOUHAIT : le destinataire ou son gestionnaire.
- Modifier ou supprimer une IDÉE : son auteur.
- Créer un lien de réinitialisation du mot de passe : **tout membre**, pour n'importe quel autre membre, **admin compris** (au cas où l'admin lui-même aurait perdu son accès).
- Retirer quelqu'un de la famille (ex. un doublon) : **admin** de la famille. On ne peut pas retirer le dernier admin. La personne retirée garde son compte ; ses comptes gérés partent avec elle et ses réservations dans la famille sont libérées (comme quand on quitte la famille).
- Nettoyer les listes, changer la date ou le nom, régénérer le lien, nommer ou retirer un admin : admin de la famille. Une famille garde toujours au moins un admin.

## 9. Profil : déplacer ou copier un souhait

- Page `/profil` : une colonne par famille, plus un sélecteur pour les comptes que je gère (`/profil?pour=ID`).
- **Glisser** une carte (par sa poignée) vers une autre famille la **déplace**. **Maintenir Alt / Option** pendant le glisser, ou utiliser le menu « ⋯ → Copier vers… », la **copie**. Le menu propose aussi « Déplacer vers… » (accessible sans souris).
- **Copier** crée un souhait indépendant, sans réservation ni commentaire.
- **Déplacer** ne révèle rien : toujours autorisé, sans avertissement. Le souhait part avec ses réservations et commentaires ; ceux qui l'avaient réservé reçoivent une **notification** (cloche dans l'en-tête). Si l'un d'eux n'est pas membre de la famille d'arrivée, il ne pourrait plus voir le souhait : sa participation est libérée et sa notification le lui dit.
- L'ordre dans une colonne se change aussi par glisser-déposer.

## 10. Routes

| Route | Contenu |
|---|---|
| `/` | Accueil et connexion |
| `/inscription` | Création de compte |
| `/familles` | Mes familles, création d'une famille |
| `/profil` | Mes listes par famille, comptes gérés |
| `/f/[slug]` | Page famille avec tous les souhaits ; c'est aussi le lien d'invitation |
| `/f/[slug]?cadeau=ID` | Popup d'un cadeau |
| `/reinitialiser/[token]` | Choisir un nouveau mot de passe (lien créé par un membre) |
| `/mot-de-passe-oublie` | Mot de passe oublié par code e-mail |
| `/connexion-code` | Connexion par code e-mail |
| `/api/apercu-lien` | Renvoie le titre, l'adresse de l'image et le prix d'un lien collé (connecté uniquement) |

## 11. Points sensibles

1. **Lecture des liens** : délai et taille maximum, blocage du réseau local à la connexion.
2. **Réservations simultanées** : mise à jour conditionnelle `takeMode = AUCUN` dans une transaction : une seule réservation passe, l'autre reçoit « Quelqu'un vient de s'en occuper ».
3. **Souhait modifié après réservation** : « Modifié depuis votre réservation » sur la carte et dans la popup.
4. **Inscription ouverte** : limite d'inscriptions par IP.
5. **Sauvegardes** : `deploy/backup.sh` (cron quotidien, `sqlite3 .backup`, 30 jours), lancé aussi avant chaque mise à jour.

## 12. Déploiement

Guide pas à pas : [`docs/deploiement.md`](deploiement.md). En bref : utilisateur `hottelist` avec Node 24 via nvm, code dans `/opt/hottelist`, `.env` (`DATABASE_URL="file:../data/hottelist.db"`, `AUTH_SECRET`, `APP_URL`, `PORT=9000`), service `deploy/hottelist.service`, bloc Caddy `deploy/Caddyfile.example`, mises à jour avec `deploy/deploy.sh`.

## 13. Étapes de construction

Toutes livrées le 9 novembre 2026 : socle, familles, cadeaux et visibilité, réservations, comptes gérés, profil, lecture des liens, fin de l'événement, finitions (mode liste, filtre « disponibles », mobile, réinitialisation, systemd, Caddy, sauvegardes).

## 14. Pistes pour plus tard

- Consulter les archives des années passées (déjà en base, pas encore d'écran).
- Transférer la gestion d'un compte géré à un autre adulte.

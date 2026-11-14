# HotteList — architecture technique (version simplifiée)

_Document de référence. Dernière mise à jour : 14 novembre 2026 (titres en Damion, favicon, montagnes en entier, ordre des listes, bouton de téléchargement ; avant : export PDF / Excel, Secret Santa)._
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
| E-mails | **Facultatifs**, par le SMTP d'Amen (`noreply@julienfluenceur.online`) : connexion par code, mot de passe oublié, confirmation d'adresse, mention dans un commentaire, rappel J-7, tirage du Secret Santa. Jamais envoyés depuis le serveur maison |
| Mentions | Dans un commentaire, `@Prénom` prévient la personne (notification + e-mail avec le cadeau et le commentaire mis en avant). Le destinataire du cadeau n'est **jamais** mentionnable |
| Images | **Aucune image stockée sur le serveur** : on enregistre seulement l'adresse de l'image trouvée dans le lien, et le navigateur l'affiche directement depuis le site d'origine |
| Listes | Une liste par famille. Sur le profil, ma liste pour chaque famille ; glisser-déposer pour **déplacer** ou **copier** un souhait vers une autre famille, et pour changer l'ordre |
| Cadeau à plusieurs | On indique seulement qu'on participe (pas de montant). Les détails se règlent en commentaire |
| Comptes gérés | Un adulte crée et administre des comptes « en procuration » (ex. ses enfants) et voit tout sur leurs listes |
| Événement | Chaque famille a un **événement** : titre et date. Par défaut **Noël, le 25 décembre** ; à la création, « Changer » propose Noël, Anniversaire (« Anniversaire de … » pré-rempli) ou Autre, avec une date au choix (pas dans le passé). Modifiable ensuite par l'admin |
| Fin de l'événement | Un encart « L'événement est terminé » avec un bouton **« Nettoyer les listes »** : il archive tous les cadeaux réservés ou à plusieurs, et laisse sur les listes ceux qui n'ont pas été offerts |
| DA | Validée le 12 novembre 2026 (détail : document « da-hottelist » du projet). En-têtes pointillés avec guirlande et montagnes, sur deux fonds : **vert sapin** par défaut (accueil, connexion, mes familles, profil, courses) et **bordeaux** en second pour l'univers d'une famille (page famille, années passées, invitation), via `tone` de `FestiveHeader` et `AuthLayout`. Sac `#CF2B35`, or `#FFCB2E`, encre `#1F3A2C`, crème `#F7F1E3`. **Damion** (manuscrite, licence libre OFL, depuis le 14 novembre à la place de Santa Natale dont la version gratuite remplaçait chiffres et ponctuation par un tampon) pour « Hotte » et les titres courts qui tiennent sur une ligne (`HeroTitle` et `listTitleProps` de `src/lib/script-metrics.ts` décident ; sinon Merienda), **Merienda** gras (manuscrite lisible) pour les autres titres, **Fraunces** italique seulement pour le « List » du logo, **Inter** pour le reste |
| Ma liste de courses | Page `/courses` : tout ce que j'offre, regroupé par destinataire, avec ma part estimée (cadeau à plusieurs divisé), le reste à acheter et un **statut privé** « à acheter / acheté / emballé ». Imprimable |
| Secret Santa | **Mode de famille** (`Family.santaMode`), à cocher à la création ou dans les Réglages (admin). L'activer **tire tout de suite** entre tous les membres qui ont leur compte (3 minimum ; à la création, l'admin lance le tirage depuis l'encart quand la famille est là). Chacun reçoit une notification et un **e-mail** (sans le nom, si adresse confirmée et rappels activés), puis clique sur **« Découvrir »** : animation où les prénoms défilent puis s'arrêtent sur la personne tirée (`revealedAt`). Encart sur le côté de la page famille (en haut sur téléphone) : « Vous offrez un cadeau à … », budget, « Revoir le tirage ». La liste de la personne tirée passe **en premier**, sur fond doré. Réglages admin : budget, **Relancer le tirage** (tout le monde redécouvre), compteur « X sur Y l'ont découvert ». Chacun ne voit que son tirage, admin compris ; le nom ne quitte le serveur qu'au clic sur « Découvrir ». Couper le mode annule le tirage |
| Logo et favicon | La hotte : sac de toile rouge, cadeau doré avec ombre floue, lien vert noué d'or. Dessin source : `src/components/brand.tsx` (`HotteMark`, `Wordmark`, `Logo`). Sur crème et sapin, la hotte classique ; sur bordeaux, couleurs inversées (`HotteMark inverse` : sac sapin `#2A6B4B`, lien rouge vif `#FF4A55`). Favicon `src/app/icon.svg` + `src/app/favicon.ico` (16/32/48) : le cadeau du logo au trait doré épais, penché, sur carré bordeaux ; icônes d'application : le cadeau sur un carré bordeaux, logos de `public/brand/` (texte en tracés), image de partage `src/app/opengraph-image.png`, logo des e-mails `public/brand/hottelist-logo-blanc.png` |

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
| Styles | Tailwind CSS 4 | `src/styles/` : `tokens.css` (couleurs et polices, seule source), `base.css`, `festive.css` (logo, en-tête, guirlande, pages d'accueil), `components.css` (boutons, champs, cartes, popups) ; `src/app/globals.css` ne fait que les importer |
| Popup, menus | Radix UI (Dialog, DropdownMenu) | Accessible au clavier |
| Glisser-déposer | dnd-kit | Souris, tactile (appui long), clavier |
| Polices | @fontsource-variable (Fraunces, Inter, Merienda), @fontsource/damion | Auto-hébergées : aucune requête vers Google. Toutes sous licence libre (OFL) |
| Export | pdfkit (PDF) et exceljs (Excel) | Hors bundle (`serverExternalPackages`) |
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

- **Inscription ouverte, validée par code** : prénom, nom facultatif, adresse e-mail et mot de passe de 8 caractères minimum. Un code à 6 chiffres (10 min, 5 essais) est envoyé à l'adresse ; le compte n'existe vraiment (identifiant = e-mail, adresse vérifiée) qu'après saisie du code. Ensuite on se connecte avec e-mail + mot de passe ; le code ne resert que pour « Mot de passe oublié » ou « Recevoir un code par e-mail ». Sans SMTP configuré, on revient à l'ancienne inscription (identifiant e-mail ou pseudo, sans vérification).
- **Adresse reprise d'un écran à l'autre** : l'adresse tapée dans Connexion ou Inscription est transmise (`?email=`) aux pages Code par e-mail, Mot de passe oublié et Inscription.
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

## 5 bis. Confort

- **Confirmations** dans le style du site (plus de fenêtres grises du navigateur).
- **Annuler** pendant 7 secondes après : réserver, participer, annuler sa réservation, supprimer un cadeau (suppression « douce » : `deletedAt`, restaurable 10 minutes).
- **Notifications** (cloche) : quelqu'un rejoint un cadeau à plusieurs dont je fais partie, commente un cadeau que j'offre ou dont j'ai parlé, déplace ou retire un souhait que j'avais réservé, lance le tirage du Secret Santa. Jamais rien pour le destinataire du cadeau.
- **Badge « Nouveau »** sur les cadeaux ajoutés par d'autres depuis ma visite précédente (une visite = plus d'une heure d'absence, pour que les badges ne disparaissent pas au premier clic).
- **Ordre des listes** sur la page famille : la personne tirée au Secret Santa, moi, mes comptes gérés, les autres ; ceux qui n'ont encore **aucun souhait** passent à la fin (même ordre dans l'export).
- **Tri** (ordre de la liste, coups de cœur, prix) et **filtre de budget** sur la page famille ; les prix libres restent toujours affichés.
- **Doublons** : à l'ajout, alerte si le même lien (site + chemin) ou le même titre est déjà dans la liste visible.
- **Partager l'invitation** : partage natif du téléphone, sinon message tout prêt copié.
- **Profil en onglets** (une famille par onglet) : toujours sur mobile, au choix sur ordinateur (mémorisé). On peut lâcher une carte sur un autre onglet pour la déplacer.
- **Installable** sur l'écran d'accueil (manifeste, icônes, plein écran).
- **Télécharger** (icône bleutée tout en bas de la page famille, et dans les Réglages de la famille) : toutes les listes en **PDF** (A4 aux couleurs du site, une partie par personne, liens cliquables ; `src/lib/export-pdf.ts`, pdfkit, polices `src/assets/fonts/`) ou en **Excel** (feuille « Toutes les listes » + une feuille par personne : type, cadeau, prix, coup de cœur, statut, site, lien, description, commentaires ; `src/lib/export-xlsx.ts`, exceljs). Le contenu passe par `giftsVisibleTo` : exactement ce que la personne voit sur le site (rien sur les réservations de sa propre liste).

## 5 ter. Mentions dans les commentaires

- En tapant **`@`** dans un commentaire, une liste propose les membres de la famille (avatar + prénom) ; flèches, Entrée ou Tab pour choisir. On peut aussi taper le nom à la main : `@Michou`, `@papiMichou` ou `@Papi Michou` sont reconnus (sans accents, majuscules ni espaces).
- Stockage : `@[Libellé](idUtilisateur)` dans le texte du commentaire. Libellé = prénom, ou prénom + initiale du nom en cas d'homonymes (`lib/mentions.ts`, testé).
- **Le serveur recalcule toujours les mentions** à partir du texte tapé et de sa propre liste autorisée : membres avec un compte, **jamais le destinataire du cadeau** (les comptes gérés non plus). Une mention trafiquée côté navigateur redevient du texte.
- Effet : notification dans la cloche (« Claire vous a mentionné sur « Casque » pour Julien : … ») et **e-mail** si l'adresse est confirmée et que le réglage « M'envoyer un e-mail quand quelqu'un me mentionne » est actif (Mon compte, activé par défaut). L'e-mail montre la carte du cadeau (image, titre, prix, pour qui, famille) et le commentaire encadré, la mention de la personne surlignée en doré, avec un bouton « Voir le cadeau et répondre ». Limite : 30 e-mails de mention par heure et par auteur.
- Affichage : mentions en surbrillance dans les commentaires ; la sienne en doré.

## 6. Fin de l'événement : « Nettoyer les listes »

- Chaque famille a un **événement** (`eventName`, « Noël » par défaut) et une **date** (25 décembre par défaut), modifiables par l'admin. Ils s'affichent partout : cartes des familles (« Noël · J-46 »), page famille, invitation, encart de fin, archives, e-mail de rappel. Changer la date relance le rappel J-7.
- Le lendemain de cette date (heure de Paris), la page famille affiche en haut un encart vert sapin et or : « C'est fini pour Noël ! Merci à tous », avec un récapitulatif « 18 cadeaux offerts · 13 encore sur les listes ».
- Le bouton **« Nettoyer les listes »** n'apparaît que pour les **admins** et ouvre d'abord une confirmation détaillée.
- **Effet** : les cadeaux réservés seuls ou à plusieurs reçoivent `archivedAt` et `archiveYear` et disparaissent des listes ; les autres restent avec leurs commentaires ; rien n'est supprimé.
- Après nettoyage, l'encart devient « Les listes sont prêtes pour la suite » et invite l'admin à choisir la date du prochain événement.
- **Années passées** (`/f/[slug]/archives`) : ce qui a été offert, par événement (« Noël 2026 », « Anniversaire de Léa 2027 ») et par personne. On voit qui a offert quoi, sauf sur ses propres cadeaux.
- **Rappel J-7** par e-mail (script `npm run rappels`, cron quotidien), une seule fois par événement.

## 7. Modèle de données

Les noms dans le code sont en anglais (`prisma/schema.prisma`).

```
User           id, firstName, lastName?, login? (unique, vide pour un compte géré), passwordHash?, avatarColor, managedById?, email? (unique), emailVerifiedAt?, emailReminders, emailMentions
Session        id (empreinte du jeton), userId, expiresAt
Family         id, name, slug unique avec suffixe aléatoire (ex. famille-leroy-7kq2), createdById, eventName (défaut « Noël »), eventDate, reminderSentFor?, santaMode
Membership     userId, familyId, role (ADMIN | MEMBRE), nickname?, joinedAt, lastSeenAt?, prevSeenAt?   — unique (userId, familyId)
Gift           id, familyId, recipientId, createdById, kind (SOUHAIT | IDEE),
               title, description?, url?, price?, imageUrl?, siteOrigin?, favorite, position,
               takeMode (AUCUN | SEUL | A_PLUSIEURS), contentUpdatedAt, archivedAt?, archiveYear?, archiveEvent?, deletedAt?
GiftParticipant giftId, userId, createdAt, status (A_ACHETER | ACHETE | EMBALLE — visible par ce participant seul)
Comment        id, giftId, authorId, text (mentions : @[Libellé](id)), createdAt
PasswordResetToken id (empreinte), userId, expiresAt, usedAt?
EmailCode      id, userId, email, purpose (VERIFY | LOGIN | RESET | SIGNUP), codeHash, attempts, expiresAt, usedAt?
Notification   id, userId, text, link?, readAt?
SecretSanta    id, familyId, createdById, budget?, createdAt
SecretSantaAssignment santaId, giverId, receiverId, revealedAt?     — un seul cercle : personne ne se tire soi-même
```

`contentUpdatedAt` ne bouge que si le titre, le lien, le prix ou la description changent : c'est ce qui déclenche « modifié depuis votre réservation ».

## 8. Règles de visibilité et de droits (le cœur du projet)

Toutes les lectures passent par `giftsVisibleTo(viewer, gifts)` (`src/lib/visibility.ts`, module pur couvert par les tests). Les données cachées ne sont **jamais envoyées** au navigateur. Les cadeaux archivés sont exclus.

- **Je suis le destinataire** : je ne vois que mes SOUHAITS, sans participants, sans statut, sans commentaires. Les IDÉES ajoutées pour moi n'existent pas pour moi.
- **Je suis le gestionnaire du destinataire** : je vois tout, y compris les idées des autres, et je peux créer, modifier, supprimer, déplacer et copier ses SOUHAITS.
- **Autre membre** : je vois tout ; je peux réserver, participer, commenter et ajouter des idées.

Droits d'écriture vérifiés côté serveur, dans chaque action :
- Réserver, participer, commenter : interdit sur un cadeau dont je suis le destinataire.
- Mentionner : seulement des membres avec un compte, jamais le destinataire du cadeau (vérifié côté serveur).
- Modifier ou supprimer un SOUHAIT : le destinataire ou son gestionnaire.
- Modifier ou supprimer une IDÉE : son auteur.
- Créer un lien de réinitialisation du mot de passe : **tout membre**, pour n'importe quel autre membre, **admin compris** (au cas où l'admin lui-même aurait perdu son accès).
- Retirer quelqu'un de la famille (ex. un doublon) : **admin** de la famille. On ne peut pas retirer le dernier admin. La personne retirée garde son compte ; ses comptes gérés partent avec elle et ses réservations dans la famille sont libérées (comme quand on quitte la famille).
- Statut d'achat : seulement le participant lui-même, et lui seul le voit.
- Secret Santa (activer, lancer, refaire, couper) : admin. Chaque participant ne reçoit que son propre tirage.
- **Pseudo dans la famille** : chaque membre peut changer le nom sous lequel n'importe quel membre apparaît dans cette famille (clic sur le titre de sa liste, ex. « Dominique » → « Maman ») ; vide = retour au prénom. Le pseudo sert partout dans la famille : titres, puces, réservations, commentaires, @mentions, notifications, tirage au sort, archives. Le vrai prénom reste affiché en petit.
- Nettoyer les listes, changer le titre ou la date de l'événement, renommer la famille (aussi d'un clic sur le nom en haut de la page), régénérer le lien, nommer ou retirer un admin : admin de la famille. Une famille garde toujours au moins un admin.

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
| `/profil` | Mes listes par famille (colonnes ou onglets), comptes gérés, Mon compte |
| `/courses` | Ma liste de courses |
| `/f/[slug]/archives` | Années passées |
| `/f/[slug]` | Page famille avec tous les souhaits ; c'est aussi le lien d'invitation |
| `/f/[slug]?cadeau=ID` | Popup d'un cadeau |
| `/f/[slug]/export?format=pdf\|xlsx` | Téléchargement de toutes les listes de la famille (membres uniquement) |
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

- Transférer la gestion d'un compte géré à un autre adulte.
- Secret Santa avec exclusions (ex. ne pas tirer son conjoint).

# Déployer HotteList sur le serveur Debian

Cible : `https://hottelist.julienfluenceur.online`, application sur `127.0.0.1:9000`, derrière Caddy.

> ⚠️ **Sur le serveur, toujours en mode production** (`npm run build` puis `npm start`, ou le service systemd).
> **Jamais `npm run dev`** derrière Caddy : le mode développement refuse de charger son JavaScript depuis un
> nom de domaine, donc la page s'affiche mais aucun bouton ne marche. Dans la console, on voit alors des erreurs
> `wss://…/_next/hmr … 502`. Si ça arrive : arrêter `npm run dev`, puis `npm run build && sudo systemctl restart hottelist`.

## 1. Utilisateur dédié et Node 24

```bash
sudo adduser --system --group --home /home/hottelist --shell /bin/bash hottelist
sudo apt install -y git sqlite3
sudo -iu hottelist
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash
source ~/.nvm/nvm.sh && nvm install 24
exit
```

## 2. Récupérer le code

```bash
sudo mkdir -p /opt/hottelist && sudo chown hottelist:hottelist /opt/hottelist
sudo -iu hottelist
git clone https://github.com/julien-leroy/HotteList.git /opt/hottelist
cd /opt/hottelist
nvm use
```

> Si le dépôt est privé, ajoutez une *deploy key* en lecture seule pour l'utilisateur `hottelist` et clonez en `git@github.com:julien-leroy/HotteList.git`.

## 3. Configuration

```bash
cp .env.example .env
sed -i "s|à-remplacer|$(openssl rand -hex 32)|" .env
chmod 600 .env
```

Le fichier `.env` doit contenir :

```
DATABASE_URL="file:../data/hottelist.db"   # relatif au dossier prisma/ → /opt/hottelist/data/hottelist.db
AUTH_SECRET="…64 caractères aléatoires…"
APP_URL="https://hottelist.julienfluenceur.online"
PORT=9000
```

> ⚠️ Ne changez jamais `AUTH_SECRET` après la mise en route : toutes les sessions et les liens de réinitialisation en cours deviendraient invalides.

## 4. Installation et compilation

L'installation doit pouvoir lancer le script `postinstall` (il génère le client Prisma). Avec npm c'est automatique. Avec pnpm, il faut l'autoriser une fois via `pnpm approve-builds`. L'avertissement `deprecated whatwg-encoding` vient d'une sous-dépendance de cheerio et est sans effet.

```bash
mkdir -p data
npm ci
npx prisma migrate deploy
npm run build
exit
```

## 5. Service systemd

```bash
sudo cp /opt/hottelist/deploy/hottelist.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now hottelist
systemctl status hottelist      # doit être « active (running) »
curl -I http://127.0.0.1:9000   # doit répondre 200
```

Pour que `deploy.sh` puisse redémarrer le service sans mot de passe :

```bash
echo 'hottelist ALL=(root) NOPASSWD: /usr/bin/systemctl restart hottelist' | sudo tee /etc/sudoers.d/hottelist
```

## 6. DNS et Caddy

1. Chez le registrar : un enregistrement **A** `hottelist` → l'IP fixe de la maison.
2. Ajouter au Caddyfile existant (cf. `deploy/Caddyfile.example`) :

   ```
   hottelist.julienfluenceur.online {
       encode zstd gzip
       reverse_proxy 127.0.0.1:9000
   }
   ```

3. `sudo systemctl reload caddy`. Caddy obtient le certificat HTTPS tout seul.

## 7. E-mails (connexion par code, mot de passe oublié)

Facultatif : sans ces réglages, le site fonctionne comme avant et n'affiche rien qui concerne l'e-mail.

1. **Boîte d'envoi** : `noreply@julienfluenceur.online`, créée chez Amen.
2. **Ajouter au `.env`** du serveur (jamais dans Git, le fichier est ignoré) :

   ```
   SMTP_HOST="smtp-fr.securemail.pro"
   SMTP_PORT=465
   SMTP_USER="noreply@julienfluenceur.online"
   SMTP_PASS="le mot de passe de la boîte"
   MAIL_FROM="HotteList <noreply@julienfluenceur.online>"
   ```

   Si la connexion échoue sur le port 465, essayez `SMTP_PORT=587`. Utilisez `smtp-fr.securemail.pro` plutôt que `smtp.julienfluenceur.online` : le certificat TLS du serveur porte le nom d'Amen, et le site refuse (à raison) un certificat qui ne correspond pas.

3. **Tester depuis le serveur** :

   ```bash
   cd /opt/hottelist && npm run test-mail -- votre.adresse@gmail.com
   ```

   La commande vérifie l'identifiant et le mot de passe, puis envoie un e-mail d'essai. Regardez s'il arrive en boîte de réception ou en spam.

4. **Redémarrer** : `sudo systemctl restart hottelist`. Les liens « Recevoir un code par e-mail » et « Mot de passe oublié ? » apparaissent sur la page de connexion, et chacun peut ajouter et confirmer son adresse dans **Mon profil → Mon compte**.

### DNS anti-spam

Dans la zone DNS de `julienfluenceur.online` chez Amen :

| Enregistrement | État | À vérifier |
|---|---|---|
| DKIM `key-amfr001._domainkey` et `key-amfr002._domainkey` (CNAME vers securemail.pro) | ✅ présents | rien |
| SPF : TXT sur `julienfluenceur.online` commençant par `v=spf1` | à vérifier | doit exister et autoriser Amen. Amen le crée en général avec la boîte mail ; sinon, demander la valeur exacte à leur support. **Un seul** enregistrement `v=spf1` par domaine. |
| DMARC : TXT sur `_dmarc.julienfluenceur.online` | à ajouter s'il manque | `v=DMARC1; p=none; adkim=r; aspf=r` pour commencer |
| MX | à vérifier | pointent vers Amen (nécessaire seulement pour recevoir des e-mails, mais certains filtres anti-spam aiment les voir) |

Pour contrôler le résultat : envoyez un e-mail d'essai vers Gmail, puis « Afficher l'original » : SPF, DKIM et DMARC doivent indiquer **PASS**.

### Rappel une semaine avant l'événement

Une fois par jour, le script regarde les familles dont l'événement tombe dans les 7 jours et envoie **un seul** rappel par événement aux membres qui ont une adresse confirmée (et n'ont pas désactivé les rappels dans « Mon compte ») : souhaits encore sans personne chez les autres, et cadeaux qu'il leur reste à acheter. Rien sur leur propre liste.

```bash
sudo -iu hottelist crontab -e
# ajouter (tous les jours à 9 h 07) :
7 9 * * * cd /opt/hottelist && . "$HOME/.nvm/nvm.sh" && nvm use --silent && npm run -s rappels >> data/rappels.log 2>&1
```

Pour voir ce qui partirait sans rien envoyer : `npm run rappels -- --dry`.

## 8. Sauvegardes

```bash
sudo -iu hottelist crontab -e
# ajouter :
15 3 * * * /opt/hottelist/deploy/backup.sh >/dev/null 2>&1
```

Les copies vont dans `/opt/hottelist/data/backups/`, gardées 30 jours. Pensez à copier ce dossier ailleurs de temps en temps (NAS, disque externe).

## Mises à jour

```bash
sudo -iu hottelist /opt/hottelist/deploy/deploy.sh
```

Le script sauvegarde la base, fait `git pull`, installe, migre, compile puis redémarre.

## Dépannage

| Problème | Commande |
|---|---|
| Les boutons ne réagissent pas, erreurs `_next/hmr` dans la console | Le site tourne en `npm run dev` : l'arrêter, `npm run build`, puis `sudo systemctl restart hottelist` |
| Voir les logs | `journalctl -u hottelist -f` |
| « L'e-mail n'a pas pu partir » | `npm run test-mail -- votre@adresse` pour voir l'erreur exacte, et `journalctl -u hottelist` (lignes `[mail]`) |
| Mot de passe oublié (sans admin) | `cd /opt/hottelist && npm run reset-password -- <identifiant>` |
| Lister les comptes | `npm run reset-password` (sans argument) |
| Restaurer une sauvegarde | `sudo systemctl stop hottelist && cp data/backups/hottelist-AAAA-MM-JJ_HHMM.db data/hottelist.db && sudo systemctl start hottelist` |

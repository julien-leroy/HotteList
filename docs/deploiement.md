# Déployer HotteList sur le serveur Debian

Cible : `https://hottelist.julienfluenceur.online`, application sur `127.0.0.1:9000`, derrière Caddy.

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

## 7. Sauvegardes

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
| Voir les logs | `journalctl -u hottelist -f` |
| Mot de passe oublié (sans admin) | `cd /opt/hottelist && npm run reset-password -- <identifiant>` |
| Lister les comptes | `npm run reset-password` (sans argument) |
| Restaurer une sauvegarde | `sudo systemctl stop hottelist && cp data/backups/hottelist-AAAA-MM-JJ_HHMM.db data/hottelist.db && sudo systemctl start hottelist` |

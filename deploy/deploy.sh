#!/usr/bin/env bash
# Mise à jour de HotteList sur le serveur. À lancer en tant qu'utilisateur hottelist :
#   sudo -u hottelist /opt/hottelist/deploy/deploy.sh
# (le redémarrage final demande sudo ; voir docs/deploiement.md)
set -euo pipefail
cd "$(dirname "$0")/.."

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use >/dev/null

echo "▶ Sauvegarde de la base avant mise à jour"
./deploy/backup.sh

echo "▶ Récupération du code"
git pull --ff-only

echo "▶ Dépendances"
npm ci

echo "▶ Migration de la base"
npx prisma migrate deploy

echo "▶ Compilation"
npm run build

echo "▶ Redémarrage"
sudo systemctl restart hottelist
echo "✔ HotteList est à jour."

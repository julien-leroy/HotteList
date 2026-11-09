#!/usr/bin/env bash
# Sauvegarde à chaud de la base SQLite, avec 30 jours de rétention.
# Cron quotidien (crontab -e de l'utilisateur hottelist) :
#   15 3 * * * /opt/hottelist/deploy/backup.sh >/dev/null 2>&1
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p data/backups
[ -f data/hottelist.db ] || { echo "Pas encore de base."; exit 0; }
stamp=$(date +%Y-%m-%d_%H%M)
sqlite3 data/hottelist.db ".backup 'data/backups/hottelist-$stamp.db'"
find data/backups -name 'hottelist-*.db' -mtime +30 -delete
echo "Sauvegarde : data/backups/hottelist-$stamp.db"

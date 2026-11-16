#!/usr/bin/env bash
# Lance HotteList sur une base de DÉMONSTRATION, pour une vidéo ou une présentation.
#
#   ./deploy/demo.sh          crée une base de démo neuve (data/demo.db) et lance le site dessus
#   ./deploy/demo.sh --keep   relance sur la base de démo existante, sans la recréer
#
# Ta vraie base (data/hottelist.db) n'est jamais ouverte : il n'y a rien à restaurer après.
# Les e-mails sont coupés pendant la démo. Ctrl+C arrête la démo ; relance ensuite le vrai
# site comme d'habitude (npm start).
#
# Connexion : julien / noel2026 (aussi maman, papa, claire, thomas, sarah, mehdi, antoine).
set -euo pipefail
cd "$(dirname "$0")/.."
DEMO="data/demo.db"
PORT=9000
KEEP=0
for arg in "$@"; do
  case "$arg" in
    --keep) KEEP=1 ;;
    -h|--help) sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Option inconnue : $arg (voir --help)"; exit 1 ;;
  esac
done

step() { printf '\n\033[1;35m▶ %s\033[0m\n' "$1"; }
ok()   { printf '  \033[32m✔\033[0m %s\n' "$1"; }
fail() { printf '\n\033[31m✖ %s\033[0m\n' "$1"; exit 1; }

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use --silent >/dev/null
export PRISMA_HIDE_UPDATE_MESSAGE=1

# Tout ce qui suit utilise la base de démo, jamais la vraie (les variables déjà définies
# passent avant celles du fichier .env, pour Prisma comme pour Next.js)
export DATABASE_URL="file:../$DEMO"
# Pas d'e-mails pendant la démo
export SMTP_HOST="" SMTP_USER="" SMTP_PASS=""

[ -d .next ] || fail "le site n'est pas compilé : lance d'abord  ./deploy/deploy.sh --no-start"
if ss -ltnH "sport = :$PORT" 2>/dev/null | grep -q .; then
  fail "le vrai site tourne encore sur le port $PORT. Arrête-le (Ctrl+C dans sa console ou sa session tmux), puis relance ce script."
fi

if [ "$KEEP" = 1 ] && [ -f "$DEMO" ]; then
  step "Base de démo existante"
  ok "$DEMO (gardée telle quelle)"
else
  step "Base de démo neuve"
  rm -f "$DEMO" "$DEMO-wal" "$DEMO-shm" "$DEMO-journal"
  out="$(npx prisma migrate deploy 2>&1)" || { echo "$out"; fail "création de la base de démo impossible"; }
  node scripts/demo-seed.mjs || fail "remplissage de la base de démo impossible"
fi

trap 'printf "\n\033[32m✔ Démo arrêtée.\033[0m Ta vraie base n'"'"'a pas bougé : relance le vrai site avec  npm start\n"' EXIT
printf '\n\033[33m★ DÉMO\033[0m : le site affiche maintenant les données de démonstration.\n'
printf '  Connexion : \033[1mjulien\033[0m / \033[1mnoel2026\033[0m   (aussi maman, papa, claire, thomas, sarah, mehdi, antoine)\n'
printf '  Le Secret Santa de la Famille Leroy attend que Julien clique sur « Découvrir ».\n'
printf '  \033[1mCtrl+C\033[0m pour arrêter la démo.\n\n'
npm start

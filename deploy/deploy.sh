#!/usr/bin/env bash
# Mise à jour de HotteList, sans service systemd.
#
#   ./deploy/deploy.sh              arrête le site, sauvegarde, met à jour, puis relance
#                                   le site DANS CETTE CONSOLE (Ctrl+C l'arrête)
#   ./deploy/deploy.sh --no-start   même chose, sans relancer le site à la fin
#   ./deploy/deploy.sh --force      réinstalle et recompile même si le code n'a pas changé
#
# À lancer avec l'utilisateur qui fait tourner le site :
#   sudo -iu hottelist /opt/hottelist/deploy/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."
APP_DIR="$(pwd -P)"
DB="data/hottelist.db"
PORT=9000                       # cf. "start" dans package.json
START=1; FORCE=0
for arg in "$@"; do
  case "$arg" in
    --no-start) START=0 ;;
    --force) FORCE=1 ;;
    -h|--help) sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Option inconnue : $arg (voir --help)"; exit 1 ;;
  esac
done

step() { printf '\n\033[1;35m▶ %s\033[0m\n' "$1"; }
ok()   { printf '  \033[32m✔\033[0m %s\n' "$1"; }
warn() { printf '  \033[33m⚠\033[0m %s\n' "$1"; }
fail() { printf '\n\033[31m✖ %s\033[0m\n' "$1"; exit 1; }

# Node de nvm (version lue dans .nvmrc)
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use --silent >/dev/null
# Pas de publicité Prisma ni de bruit npm pendant l'installation
export PRISMA_HIDE_UPDATE_MESSAGE=1

# --------------------------------------------------------------------------- helpers
# Processus du site lancés depuis CE dossier : npm start, node …/next start, next-server.
# On ne regarde que de vrais processus node / npm / next-server (jamais un shell dont la
# commande contiendrait ces mots) et jamais ce script ni ses parents.
ancestors() { local p=$$; while [ "$p" -gt 1 ]; do echo "$p"; p="$(ps -o ppid= -p "$p" | tr -d ' ')"; done; }
app_pids() {
  local pid cmd exe mine
  mine=" $(ancestors | tr '\n' ' ') "
  for pid in $(pgrep -u "$(id -u)" -f 'next|npm' 2>/dev/null || true); do
    case "$mine" in *" $pid "*) continue ;; esac
    [ "$(readlink "/proc/$pid/cwd" 2>/dev/null)" = "$APP_DIR" ] || continue
    cmd="$(tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null || true)"
    exe="$(basename "${cmd%% *}")"
    case "$exe" in
      node|npm|next-server*) ;;
      *) continue ;;
    esac
    if echo "$cmd" | grep -qE 'next(/dist/bin/next)? (start|dev)|next-server|npm(-cli\.js)? (run )?(start|dev)'; then echo "$pid"; fi
  done
}

port_busy() { ss -ltnH "sport = :$PORT" 2>/dev/null | grep -q .; }

# Processus qui ont la base ouverte (ceux de l'utilisateur courant, ou tous avec sudo)
db_holders() {
  local fd pid target
  for fd in /proc/[0-9]*/fd/*; do
    target="$(readlink "$fd" 2>/dev/null)" || continue
    case "$target" in "$APP_DIR/$DB"|"$APP_DIR/$DB-wal"|"$APP_DIR/$DB-journal")
      pid="${fd#/proc/}"; pid="${pid%%/*}"
      echo "    PID $pid : $(tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null | cut -c1-110)" ;;
    esac
  done | sort -u
}

db_locked() {
  [ -f "$DB" ] || return 1
  ! sqlite3 -cmd ".timeout 3000" "$DB" "BEGIN IMMEDIATE; ROLLBACK;" >/dev/null 2>&1
}

stopped_msg() {
  echo
  echo "  Le site est arrêté. Une fois le problème réglé, relance : ./deploy/deploy.sh"
  [ -n "${BACKUP_FILE:-}" ] && echo "  Sauvegarde faite avant la mise à jour : $BACKUP_FILE"
}

# --------------------------------------------------------------------------- 1. arrêt
step "Arrêt du site"
if systemctl is-active --quiet hottelist 2>/dev/null; then
  fail "Le service systemd « hottelist » tourne encore et relancerait le site tout seul.
  Désactive-le une bonne fois :  sudo systemctl disable --now hottelist"
fi
pids="$(app_pids)"
if [ -z "$pids" ]; then
  ok "le site n'était pas lancé"
else
  # shellcheck disable=SC2086
  kill -TERM $pids 2>/dev/null || true
  for _ in $(seq 1 30); do
    still=""; for p in $pids; do kill -0 "$p" 2>/dev/null && still="$still $p"; done
    [ -z "$still" ] && break
    sleep 0.5
  done
  # shellcheck disable=SC2086
  if [ -n "$still" ]; then kill -KILL $still 2>/dev/null || true; fi
  ok "site arrêté (PID $(echo "$pids" | tr '\n' ' '))"
fi
if port_busy; then
  fail "Le port $PORT est encore occupé par un autre processus (lancé par un autre utilisateur ?).
  Pour le voir :  sudo ss -ltnp 'sport = :$PORT'"
fi

# --------------------------------------------------------------------------- 2. sauvegarde
step "Sauvegarde de la base"
BACKUP_FILE="$(./deploy/backup.sh | sed -n 's/^Sauvegarde : //p')" || fail "la sauvegarde a échoué (sqlite3 installé ? base verrouillée ?)"
if [ -n "$BACKUP_FILE" ]; then ok "$BACKUP_FILE"; else ok "pas encore de base"; fi

# --------------------------------------------------------------------------- 3. code
step "Récupération du code"
before="$(git rev-parse HEAD)"
git pull --ff-only --quiet || { stopped_msg; fail "git pull a échoué (modifications locales ?  git status)"; }
after="$(git rev-parse HEAD)"
deployed="$(cat data/.deployed-commit 2>/dev/null || true)"
if [ "$before" = "$after" ]; then ok "déjà à jour ($(git log -1 --format='%h %s'))"
else ok "$(git log --oneline "$before..$after" | wc -l) nouveau(x) commit(s) :"; git log --format='     %h %s' "$before..$after"; fi

if [ "$FORCE" = 0 ] && [ "$after" = "$deployed" ] && [ -d node_modules ] && [ -f .next/BUILD_ID ]; then
  ok "rien n'a changé depuis le dernier déploiement : pas de réinstallation ni de compilation (--force pour forcer)"
else
  # ------------------------------------------------------------------------- 4. dépendances
  step "Dépendances"
  npm ci --no-fund --no-audit --loglevel=error || { stopped_msg; fail "npm ci a échoué"; }
  ok "dépendances installées"

  # ------------------------------------------------------------------------- 5. migration
  step "Migration de la base"
  if db_locked; then
    warn "la base est verrouillée par un autre programme :"
    db_holders | grep . || echo "    (aucun processus visible pour $(id -un) : relance avec sudo pour tout voir)"
    echo "    Ferme-le (console sqlite3, SQLite GUI en train d'écrire, ancien serveur…) puis relance."
    stopped_msg; exit 1
  fi
  # Base créée sans « migrate deploy » (ex. prisma db push) : on note d'abord comme appliquées
  # les migrations déjà présentes, sinon Prisma voudrait tout recréer (« table "User" already exists »)
  node --no-warnings deploy/baseline-migrations.mjs "$DB" || { stopped_msg; fail "impossible de remettre d'accord l'historique des migrations"; }
  if ! out="$(npx prisma migrate deploy 2>&1)"; then
    echo "$out"; stopped_msg; fail "la migration a échoué"
  fi
  echo "$out" | grep -E 'migration\.sql|└─' | sed 's/^/    /' || true
  ok "base à jour"

  # ------------------------------------------------------------------------- 6. compilation
  step "Compilation"
  npm run build --silent || { stopped_msg; fail "la compilation a échoué"; }
  echo "$after" > data/.deployed-commit
fi

# --------------------------------------------------------------------------- 7. démarrage
if [ "$START" = 0 ]; then
  printf '\n\033[32m✔ HotteList est à jour.\033[0m Lance-le avec :  npm start\n'
  exit 0
fi
step "Démarrage"
if [ -n "${SSH_CONNECTION:-}" ] && [ -z "${TMUX:-}${STY:-}" ]; then
  warn "tu es en SSH hors de tmux : si la connexion se ferme, le site s'arrête avec."
  echo "    Pour qu'il survive à la déconnexion : tmux new -s hottelist, puis relance ce script dedans."
fi
printf '\n\033[32m✔ HotteList est à jour.\033[0m Le site tourne dans cette console : \033[1mCtrl+C\033[0m pour l'"'"'arrêter.\n\n'
exec npm start

#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="${PROJECT_ROOT:-/opt/vtb-faceguard}"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
WEB_ROOT="${WEB_ROOT:-/var/www/vtb-faceguard}"
SERVICE_NAME="${SERVICE_NAME:-vtb-faceguard}"
BACKUP_SUFFIX="$(date +%Y%m%d-%H%M%S)"
SQLITE_PATH="${SQLITE_PATH:-data/faceguard.sqlite3}"

if [[ "$SQLITE_PATH" != /* ]]; then
  SQLITE_PATH="$BACKEND_DIR/$SQLITE_PATH"
fi

UPDATE_BACKEND=1
UPDATE_FRONTEND=1
INSTALL_BACKEND_DEPS=1
INSTALL_FRONTEND_DEPS=1
MAKE_BACKUP=1

usage() {
  cat <<EOF
Usage: $(basename "$0") [options]

Options:
  --frontend-only         Update only frontend
  --backend-only          Update only backend
  --skip-backend-deps     Skip pip install -r requirements.txt
  --skip-frontend-deps    Skip npm install
  --no-backup             Do not back up SQLite database and uploads
  --help                  Show this help

Environment overrides:
  PROJECT_ROOT=/opt/vtb-faceguard
  WEB_ROOT=/var/www/vtb-faceguard
  SERVICE_NAME=vtb-faceguard
  SQLITE_PATH=data/faceguard.sqlite3
EOF
}

log() {
  printf '\n[%s] %s\n' "$(date '+%H:%M:%S')" "$1"
}

require_dir() {
  local path="$1"
  if [[ ! -d "$path" ]]; then
    echo "Directory not found: $path" >&2
    exit 1
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --frontend-only)
      UPDATE_BACKEND=0
      UPDATE_FRONTEND=1
      shift
      ;;
    --backend-only)
      UPDATE_BACKEND=1
      UPDATE_FRONTEND=0
      shift
      ;;
    --skip-backend-deps)
      INSTALL_BACKEND_DEPS=0
      shift
      ;;
    --skip-frontend-deps)
      INSTALL_FRONTEND_DEPS=0
      shift
      ;;
    --no-backup)
      MAKE_BACKUP=0
      shift
      ;;
    --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

require_dir "$PROJECT_ROOT"

log "Pulling latest code"
git -C "$PROJECT_ROOT" pull --ff-only

if [[ "$MAKE_BACKUP" -eq 1 && "$UPDATE_BACKEND" -eq 1 ]]; then
  log "Creating backup of backend state"
  if [[ -f "$SQLITE_PATH" ]]; then
    cp "$SQLITE_PATH" "$SQLITE_PATH.$BACKUP_SUFFIX.bak"
  fi
  if [[ -d "$BACKEND_DIR/uploads" ]]; then
    rm -rf "$BACKEND_DIR/uploads.$BACKUP_SUFFIX.bak"
    cp -r "$BACKEND_DIR/uploads" "$BACKEND_DIR/uploads.$BACKUP_SUFFIX.bak"
  fi
fi

if [[ "$UPDATE_BACKEND" -eq 1 ]]; then
  require_dir "$BACKEND_DIR"
  log "Updating backend"
  source "$BACKEND_DIR/.venv/bin/activate"
  if [[ "$INSTALL_BACKEND_DEPS" -eq 1 ]]; then
    pip install -r "$BACKEND_DIR/requirements.txt"
  fi
  systemctl restart "$SERVICE_NAME"
  systemctl status "$SERVICE_NAME" --no-pager
fi

if [[ "$UPDATE_FRONTEND" -eq 1 ]]; then
  require_dir "$FRONTEND_DIR"
  log "Updating frontend"
  cd "$FRONTEND_DIR"
  if [[ "$INSTALL_FRONTEND_DEPS" -eq 1 ]]; then
    npm install
  fi
  npm run build
  mkdir -p "$WEB_ROOT"
  rm -rf "$WEB_ROOT"/*
  cp -r "$FRONTEND_DIR/dist/"* "$WEB_ROOT/"
  systemctl reload nginx
fi

log "Recent backend logs"
journalctl -u "$SERVICE_NAME" -n 30 --no-pager

log "Deploy finished"

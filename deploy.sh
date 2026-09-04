#!/usr/bin/env bash
#
# deploy.sh — build & deploy Next.js standalone untuk wasnaker-frontend.
#
# Workflow:
#   1. npm run build (menghasilkan .next dengan folder static terpisah)
#   2. Salin .next/static -> .next/standalone/.next/static (wajib! server.js
#      di standalone tidak menyajikan static di luar dir-nya)
#   3. Normalkan kepemilikan agar:
#        - user build (owner) bisa nulis .next tanpa sudo (setgid grup www)
#        - service www (wasnaker-web.service) bisa membaca standalone
#   4. Restart wasnaker-web.service
#
# Requirement: jalankan sebagai user yang punya izin tulis ke proyek
# (cukup tanpa sudo karena .next di-set setgid grup www). Restart service
# membutuhkan priv sudo; gunakan --skip-restart utk menunda.
#
# Usage:
#   ./deploy.sh               # build + normalize + restart
#   ./deploy.sh --skip-build  # tanpa build, hanya normalize + restart
#   ./deploy.sh --skip-restart # build + normalize, restart manual
#
set -euo pipefail

cd "$(dirname "$0")"
ROOT="$(pwd)"
NEXT_DIR="$ROOT/.next"
STANDALONE_DIR="$NEXT_DIR/standalone"
SERVICE="wasnaker-web.service"

SKIP_BUILD=0
SKIP_RESTART=0
for arg in "$@"; do
  case "$arg" in
    --skip-build)   SKIP_BUILD=1 ;;
    --skip-restart) SKIP_RESTART=1 ;;
    *) echo "ERROR: unknown argument: $arg" >&2; exit 1 ;;
  esac
done

echo ">> Workdir : $ROOT"

# --- 1. build ---
if [[ "$SKIP_BUILD" -eq 1 ]]; then
  echo ">> --skip-build: melewati build."
elif [[ -d "$ROOT/node_modules" ]]; then
  echo ">> Menjalankan build..."
  npm run build
else
  echo "ERROR: node_modules tidak ditemukan. Jalankan npm install dulu." >&2
  exit 1
fi

if [[ ! -d "$STANDALONE_DIR" ]]; then
  echo "ERROR: $STANDALONE_DIR tidak ditemukan (build gagal / output.output bukan standalone)." >&2
  exit 1
fi

# --- 2. salin static ke standalone ---
echo ">> Menyalin static -> standalone/.next/static ..."
rm -rf "$STANDALONE_DIR/.next/static"
cp -R "$NEXT_DIR/static" "$STANDALONE_DIR/.next/static"

# --- 3. normalkan kepemilikan: grup www + setgid + group-write ---
# Owner tetap user build; grup www agar service (www) bisa baca, dan setgid
# agar file/dir baru di .next ikut grup www (build berikutnya tanpa sudo).
if command -v sudo >/dev/null 2>&1 && sudo -n true 2>/dev/null; then
  echo ">> Menormalkan kepemilikan (sudo) .next -> grup www + setgid ..."
  sudo -n chown -R ":www" "$NEXT_DIR"
  sudo -n chmod -R g+rwX "$NEXT_DIR"
  sudo -n chmod g+s "$STANDALONE_DIR/.next" 2>/dev/null || true
else
  echo ">> Tanpa sudo: pastikan .next sudah grup www & group-writable."
fi

# --- 4. restart service ---
if [[ "$SKIP_RESTART" -eq 1 ]]; then
  echo ">> --skip-restart: tidak me-restart $SERVICE."
  echo ">> Selesai. Restart manual: sudo systemctl restart $SERVICE"
  exit 0
fi

if command -v sudo >/dev/null 2>&1 && sudo -n true 2>/dev/null; then
  echo ">> Me-restart $SERVICE (sudo)..."
  sudo -n systemctl restart "$SERVICE"
  sleep 2
  sudo -n systemctl is-active "$SERVICE"
else
  echo "ERROR: restart service butuh sudo, tapi sudo -n tidak tersedia." >&2
  echo "Jalankan: sudo systemctl restart $SERVICE" >&2
  exit 1
fi

echo ">> DONE."

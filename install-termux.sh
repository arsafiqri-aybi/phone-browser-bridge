#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

ZIP="$HOME/storage/downloads/Phone_Browser_Bridge_1.0.0.zip"
DEST="$HOME/phone-browser-bridge-runtime"

if [ ! -d "$HOME/storage/downloads" ]; then
  echo "Storage Termux belum aktif. Jalankan: termux-setup-storage"
  exit 1
fi

if [ ! -f "$ZIP" ]; then
  echo "File tidak ditemukan: $ZIP"
  echo "Pastikan Phone_Browser_Bridge_1.0.0.zip ada di folder Download HP."
  exit 1
fi

echo "[1/4] Installing runtime packages..."
pkg update -y
pkg install -y nodejs-lts cloudflared unzip git

echo "[2/4] Extracting Phone Browser Bridge..."
rm -rf "$DEST"
mkdir -p "$DEST"
unzip -q "$ZIP" -d "$DEST"

MCP="$DEST/phone-browser-bridge/mcp"
if [ ! -f "$MCP/package.json" ]; then
  echo "Struktur ZIP tidak sesuai; mcp/package.json tidak ditemukan."
  exit 1
fi

cd "$MCP"
echo "[3/4] Installing locked Node dependencies..."
npm ci --ignore-scripts

echo "[4/4] Local setup. Masukkan password owner dan token pairing BARU hanya di prompt Termux."
npm run setup

echo
echo "Setup selesai. Jalankan:"
echo "cd '$MCP'"
echo "termux-wake-lock"
echo "npm run start:phone"

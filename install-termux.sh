#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
# Run from a cloned checkout. Never delete an existing runtime or its private .env.
project_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
if [ ! -d "$project_dir/agent" ]; then echo 'Jalankan dari checkout repo Phone Browser Bridge v2.' >&2; exit 1; fi
pkg install -y nodejs-lts android-tools termux-services
cd "$project_dir/agent"
npm ci --omit=dev --ignore-scripts --no-fund
if [ ! -f .env ]; then npm run setup; else echo 'Konfigurasi lama dipertahankan. npm run setup jika ingin menggantinya.'; fi
echo 'Lanjutkan pairing di docs/PASANG_ANDROID.md. Lalu npm start.'

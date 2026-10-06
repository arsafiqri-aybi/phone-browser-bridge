#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
agent_dir="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
if [ ! -f "$agent_dir/.env" ]; then echo 'npm run setup dahulu.' >&2; exit 1; fi
if [ -z "${PREFIX:-}" ] || [ ! -d "$PREFIX/var/service" ]; then echo 'Pasang termux-services dan buka ulang Termux dahulu.' >&2; exit 1; fi
unit_dir="$PREFIX/var/service/phone-chrome-agent"
if [ -e "$unit_dir" ]; then echo 'Service sudah ada. Periksa service lama sebelum menggantinya.' >&2; exit 1; fi
mkdir -m 700 "$unit_dir"
# Quote a path rather than accepting shell code from remote requests.
node - "$agent_dir" "$unit_dir/run" <<'JS'
const fs=require('fs');const quote=s=>"'"+s.replace(/'/g,"'\\''")+"'";
fs.writeFileSync(process.argv[3],'#!/data/data/com.termux/files/usr/bin/sh\ncd '+quote(process.argv[2])+'\nexec node --env-file=.env src/index.js 2>&1\n',{mode:0o700});
JS
sv-enable phone-chrome-agent
echo 'Service agen diaktifkan. Hentikan dengan sv down phone-chrome-agent.'

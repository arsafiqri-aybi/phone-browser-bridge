#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
agent_dir="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
[ -f "$agent_dir/.env" ] || { echo 'npm run setup dahulu.' >&2; exit 1; }
[ -n "${PREFIX:-}" ] && [ -d "$PREFIX/var/service" ] || { echo 'Pasang termux-services dan buka ulang Termux dahulu.' >&2; exit 1; }
unit_dir="$PREFIX/var/service/phone-chrome-agent"
if [ -e "$unit_dir/run" ] && ! rg_marker=$(cat "$unit_dir/run" | sed -n '/phone-chrome-agent-managed\|exec node --env-file=.env/p'); then exit 1; fi
if [ -e "$unit_dir/run" ] && [ -z "${rg_marker:-}" ]; then echo 'Service kustom ditemukan; tidak ditimpa.' >&2; exit 1; fi
mkdir -p "$unit_dir/log" "$PREFIX/var/log/sv/phone-chrome-agent"
chmod 700 "$unit_dir" "$unit_dir/log"
# Take the service down while atomically replacing its generated files.
touch "$unit_dir/down"
sv down "$unit_dir" 2>/dev/null || true
node - "$agent_dir" "$unit_dir" "$PREFIX" <<'JS'
const fs=require('fs');const [dir,unit,prefix]=process.argv.slice(2);const quote=s=>"'"+s.replace(/'/g,"'\\''")+"'";
const save=(file,text)=>{fs.writeFileSync(file+'.tmp',text,{mode:0o700});fs.renameSync(file+'.tmp',file);};
save(unit+'/run','#!/data/data/com.termux/files/usr/bin/sh\n# phone-chrome-agent-managed v2.1\ncd '+quote(dir)+' || exit 1\ntermux-wake-lock\nexec node --env-file=.env src/index.js 2>&1\n');
save(unit+'/finish','#!/data/data/com.termux/files/usr/bin/sh\ntermux-wake-unlock\n');
save(unit+'/log/run','#!/data/data/com.termux/files/usr/bin/sh\nexec svlogd -tt '+quote(prefix+'/var/log/sv/phone-chrome-agent')+'\n');
save(prefix+'/bin/chrome-bridge','#!/data/data/com.termux/files/usr/bin/bash\nexec bash '+quote(dir+'/scripts/control.sh')+' "$@"\n');
fs.writeFileSync(prefix+'/var/log/sv/phone-chrome-agent/config','s200000\nn3\n',{mode:0o600});
JS
sv-enable phone-chrome-agent
printf '%s\n' 'Siap. Gunakan chrome-bridge status / start / stop / logs.'

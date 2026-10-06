#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
agent_dir="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
unit_dir="${PREFIX:?Jalankan di Termux}/var/service/phone-chrome-agent"
case "${1:-status}" in
 start) [ -f "$unit_dir/run" ] || { echo 'Jalankan bash scripts/install-service.sh dahulu.'; exit 1; }; termux-wake-lock; sv-enable phone-chrome-agent; sv status "$unit_dir" ;;
 stop) sv-disable phone-chrome-agent; termux-wake-unlock; printf '%s\n' 'Agen dihentikan dan tetap nonaktif sampai kamu memulainya lagi. Jeda juga kendali di APK.' ;;
 status) sv status "$unit_dir"; printf '%s\n' 'Status browser dan relay terlihat di APK / panel.' ;;
 logs) tail -n 40 "$PREFIX/var/log/sv/phone-chrome-agent/current" ;;
 adb) cd "$agent_dir"; node --env-file=.env scripts/configure-adb.js "${2:-}"; if [ -f "$unit_dir/run" ] && [ ! -f "$unit_dir/down" ]; then sv restart "$unit_dir"; fi ;;
 boot-on) mkdir -p "$HOME/.termux/boot"; node - "$unit_dir" "$HOME/.termux/boot/phone-chrome-bridge" <<'JS'
const fs=require('fs');const [unit,file]=process.argv.slice(2);const quote=s=>"'"+s.replace(/'/g,"'\\''")+"'";
fs.writeFileSync(file,'#!/data/data/com.termux/files/usr/bin/sh\n[ -f '+quote(unit+'/down')+' ] && exit 0\ntermux-wake-lock\n. "$PREFIX/etc/profile.d/start-services.sh"\n',{mode:0o700});
JS
 printf '%s\n' 'Pasang Termux:Boot dari sumber yang sama dengan Termux, lalu buka sekali. Wireless Debugging setelah reboot mungkin perlu dinyalakan kembali.' ;;
 boot-off) rm -f "$HOME/.termux/boot/phone-chrome-bridge"; printf '%s\n' 'Mulai setelah restart HP dinonaktifkan.' ;;
 *) printf '%s\n' 'chrome-bridge start | stop | status | logs | adb IP:PORT | boot-on | boot-off'; exit 1 ;;
esac

# Phone Browser Bridge v2

Kendali **Chrome asli di HP Android milikmu** dari alat MCP di ChatGPT. Cloudflare menyediakan endpoint HTTPS dan relay; browser tidak berjalan di cloud. Izin kendali di APK berlaku sampai pemilik menekan Jeda, tanpa timer 30 menit.

| Bagian | Peran |
| --- | --- |
| `android/` | APK dengan izin pemilik, Jeda, diagnosis Accessibility, dan server loopback bertoken |
| `agent/` | Agen Termux, koneksi keluar WebSocket, Chrome DevTools / fallback Accessibility |
| `cloudflare/` | Worker baru, SQLite Durable Object, OAuth PKCE dan panel pemilik |
| `docs/` | Pemasangan, diagnosis, batas kemampuan, dan kontrak pengujian |
| `dist/` | Checksum APK; berkas APK hasil build diberikan terpisah dan tidak di-commit |

**MCP:** https://phone-chrome-mcp.arsafiqri-ua03.workers.dev/mcp  
**Panel:** https://phone-chrome-mcp.arsafiqri-ua03.workers.dev/admin

Mulai dari [panduan pemasangan](docs/PASANG_ANDROID.md). Password pemilik dan token perangkat diberikan terpisah; tidak ada secret di repo. Jangan mengunggah `agent/.env`, `.dev.vars`, jurnal lokal, atau signing key.

Mode DevTools dapat mengendalikan halaman tab Chrome saat aplikasi lain berada di depan, selama Android menjaga Chrome dan agen tetap tersedia. Mode Accessibility memakai layar Chrome yang terlihat. Tidak menjanjikan akses semua UI Chrome, semua website, dialog Android, atau hidup tanpa batas di setiap HP. OTP/CAPTCHA membutuhkan pemilik. Tindakan publish/send/delete harus sesuai perintah pengguna.

## Pengujian pengembang

```sh
npm ci --prefix agent --ignore-scripts
npm ci --prefix cloudflare --ignore-scripts
export CHROME_TEST_EXECUTABLE=/absolute/path/to/chrome
npm test --prefix agent
npm test --prefix cloudflare
```

Tanpa executable Chrome, pengujian Chrome/visual ditandai **SKIP**, bukan PASS. Test sistem menjalankan workerd, OAuth, client MCP resmi, socket bertoken, agen, lalu Chrome sungguhan. APK dibangun terpisah memakai Android SDK 35/Java17:

```sh
ANDROID_SDK_ROOT=/path/to/sdk python3 scripts/build-apk.py
```

Signing key harus milik pemilik proyek dan berada di luar repo. Keystore baru menghasilkan APK yang tidak dapat meng-upgrade aplikasi dengan sertifikat lama. Bukti serta batas pengujian ada di [evidence/VERIFICATION.md](evidence/VERIFICATION.md).

## Deploy ulang Cloudflare

Worker khusus proyek ini bernama `phone-chrome-mcp`. Untuk akun yang sama, gunakan `cloudflare/wrangler.jsonc`. Buat hash password/token melalui `scripts/generate-config.mjs` ke folder privat **di luar repo**. Pasang `OWNER_PASSWORD_HASH` dan `PHONE_TOKEN_HASH` sebagai Worker secrets; jalankan `npm run deploy --prefix cloudflare`. Jangan mengganti hash/token deployment yang sudah terhubung kecuali pemilik ingin melakukan pairing ulang. Tidak perlu Cloudflare Tunnel, cloudflared, atau Quick Tunnel.

Perintah tidak diulang otomatis saat timeout. `action_id` disimpan dalam jurnal lokal sebelum aksi; ID yang sama dengan isi berbeda ditolak. Screenshot/ref memiliki masa berlaku 20 detik untuk menghindari klik target lama. Masa berlaku ref dan timeout per permintaan bukan batas durasi sesi.

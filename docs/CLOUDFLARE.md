# Server milik pemilik instalasi

Live deployment belum dijalankan: akun/binding API Cloudflare tidak tersedia di sesi pembangunan. Distribusi tidak membutuhkan akun atau endpoint pembuat. Pastikan Workers dan SQLite Durable Objects tersedia dalam plan akun Anda; cek pricing/free quota resmi sebelum mengaktifkan resource. Script tidak berlangganan plan berbayar.

Di komputer/CI, pasang Node 24, lalu `cd source/cloudflare && npm ci`. Login melalui `npx wrangler login`, atau sediakan `CLOUDFLARE_API_TOKEN` serta `CLOUDFLARE_ACCOUNT_ID` melalui secret manager. Token membutuhkan hak Workers Scripts dan Durable Objects yang sesuai akun. Jangan menaruh token ke source/ZIP/chat.

Pilih nama Worker baru dan installation ID acak minimal 16 karakter. Dari root proyek:

```sh
export BRIDGE_WORKER_NAME=nama-instalasi-baru-anda
export BRIDGE_INSTALLATION_ID=ID_ACAK_BARU_MINIMAL_16_KARAKTER
export CLOUDFLARE_ACCOUNT_ID=ACCOUNT_ID_ANDA
node scripts/deploy.mjs configure
node scripts/deploy.mjs check
node scripts/deploy.mjs deploy
node scripts/deploy.mjs set-password
```

Periksa file `source/cloudflare/installation.local.json` sebelum deploy. Bootstrap berhenti jika resource existing atau ketidakadaan resource tidak dapat dipastikan; ia tidak menimpa instalasi lama. `set-password` memakai prompt secret Wrangler; isi password owner kuat, bukan password akun Cloudflare. Login panel setelah secret tersedia. Nama default/config contoh tidak boleh dideploy tanpa konfigurasi owner.

Bindings: REGISTRY → Registry (SQLite Durable Object per installation); DEVICES → DeviceRelay (SQLite Durable Object per device). Migration v1 dibuat otomatis pada deploy. Tidak ada database/resource lama yang dibuang. Bundle worker di dist bukan mengganti kebutuhan bindings/migration/config. Untuk update instalasi yang memang Anda otorisasi: review diff, pertahankan nama/installation ID/migrations, `npx wrangler deploy --config installation.local.json` dari source/cloudflare. Rollback dengan `node scripts/deploy.mjs rollback`; rollback kode tidak mengembalikan skema/data yang telah berubah. Cleanup destruktif hanya manual dengan review resource di dashboard.

MCP endpoint adalah HTTPS root server + `/mcp`. Metadata OAuth resource/discovery, register client public, authorization code PKCE S256, resource/audience tepat, scopes read/control, expiry access 1 jam dan refresh 30 hari. Login pemilik dan pilih scope perangkat di consent page. Device credential terpisah, unik dan dapat dicabut; enrollment sekali pakai 5 menit. Credential device berlaku 90 hari dan APK mencoba rotasi HTTPS dengan credential yang masih valid (pertama setelah 1 jam, lalu setiap 24 jam). Credential lama ditolak setelah rotasi. Jika aplikasi lama tidak aktif hingga token kedaluwarsa atau storage gagal saat menyimpan token baru, owner perlu enrollment baru dan mencabut identitas lama. Trust ADB lokal tidak perlu dibuat ulang hanya karena enrollment server. Rotasi diuji dengan harness backend; jadwal APK masih memerlukan uji perangkat.

Untuk ChatGPT/Codex, gunakan konfigurasi koneksi MCP/custom connector yang tersedia pada produk dan paket akun Anda, masukkan URL MCP server sendiri dan ikuti OAuth. UI/capability dapat berbeda. Kompatibilitas handshake/call dibuktikan dengan MCP SDK Node 1.32.1 secara lokal; koneksi pada client ChatGPT/Codex target belum diuji. Upload ZIP saja tidak menyambungkan MCP.

Observability default dinonaktifkan agar auth/body/URL tidak masuk log provider secara otomatis. Metadata health tersimpan tanpa isi halaman. Screenshot maksimal ~1,5 MB binary / 2.000.000 base64 chars, envelope 64 KB, body 64 KB, command deadline 20 detik, pending relay 6, screenshot 1. Batas aplikasi ini diuji secara lokal; kapasitas/biaya dan WebSocket lifecycle live Cloudflare tetap G8 pending. Lihat dokumentasi resmi Cloudflare dan MCP pada SOURCES.md.

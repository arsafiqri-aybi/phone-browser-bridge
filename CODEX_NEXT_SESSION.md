# Melanjutkan proyek

Owner meminta isi repo sebelumnya dihapus dan diganti hasil pembangunan brief ZIP. Checkout Git dipertahankan; backup lama berada di luar repo. Jangan mengimpor source backup. Brief 1.0 tetap utuh di docs/brief. Baca AGENTS.md, START_HERE.md, PROJECT_STATE.md dan evidence/VERIFICATION.md.

Build memakai JDK Temurin 17.0.16+8, Gradle 8.9, AGP 8.7.3, compileSdk 35, minSdk 31, targetSdk 32, NDK 27.0.12077973, CMake 3.22.1. APK 0.1.0 debug. Native ABI arm64-v8a, armeabi-v7a, x86_64. Target 32 dipilih untuk baseline Android 12 direct APK; penyesuaian target/policy Android baru dan Play Store adalah pekerjaan terpisah yang harus diuji. Tidak ada klaim store-ready.

LibADB 3.1.1 dipatch untuk pin peer setelah PAKE yang terikat TLS exporter, timeout, dan lifecycle. SPAKE2 Java murni gagal upstream tests dan tidak digunakan; JNI + C memakai commit submodule resmi, dengan getrandom menggantikan rand serta perbaikan double-free. Semua patch ada di docs/DEPENDENCY_PATCHES.md.

Source backend menggunakan Worker dan SQLite Durable Objects per registry/per device. MCP OAuth public PKCE/DCR dengan pemilihan scope perangkat saat consent, sessions terikat credential, journal tombstone maksimal 10.000 per perangkat. UNKNOWN tidak diulang. Tool tidak mengekspos shell/evaluate/cookie export. Backend harness memakai dua device fixture; gambar fixture bukan screenshot Android.

```sh
cd /workspace/phone-browser-bridge
bash scripts/cloud-setup.sh
source /workspace/toolchains/activate.sh
node scripts/run-backend-tests.mjs
bash scripts/verify-local.sh
```

Gunakan checkout yang sudah ada dalam lingkungan cloud terisolasi; jangan membuat worktree kecuali owner meminta. Service dev tidak bertahan setelah snapshot: `cd source/cloudflare && npm run dev`, lalu `node /workspace/phone-browser-bridge/scripts/smoke-local.mjs` dari shell terpisah. `.dev.vars` adalah credential test lokal yang diabaikan Git, tidak dibundel; `scripts/init-local.py` membuatnya jika belum ada tanpa mencetak nilai.

Prioritas berikut: G1 pada ponsel Android 12 yang diotorisasi. Verifikasi self-device NSD, peer SPKI yang stabil antara TLS pairing dan connect, Chrome `/json` endpoints pada ponsel, dan persist trust ketika port berganti. Jika berbeda, investigasi protokol dari sumber resmi; jangan disable verifikasi, menambah Termux, atau menurunkan gate. Kemudian G2–G5 dan G6 dua ponsel. Akun Cloudflare dan owner release key belum tersedia: siapkan lewat kanal secure/settings, jangan chat secret. Live deployment, release signing, client ChatGPT/Codex dan soak fisik belum diuji.

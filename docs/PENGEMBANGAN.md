# Lingkungan pengembangan

Di Linux x86_64 dengan Python 3.12+, Node 24 dan curl, jalankan `bash scripts/cloud-setup.sh` dari root proyek. Script memakai toolchain pinned di `/workspace/toolchains` atau `BRIDGE_TOOLCHAIN_ROOT`, memverifikasi checksum download, mempertahankan TLS/proxy CA, memasang SDK/NDK lewat manager resmi, menjalankan npm ci, membuat credential test lokal bila belum ada, membangun APK serta bundle Worker. Script tidak mengubah source/lockfile saat setup. Kunci debug tetap di luar repo; jangan masukkan ke distribusi.

Aktifkan tools dengan `source /workspace/toolchains/activate.sh`. Jalankan `node scripts/run-backend-tests.mjs` untuk test Worker/Durable Objects nyata secara lokal, dengan server sementara dan state terpisah yang dibersihkan setelah lulus. `bash scripts/verify-local.sh` juga menjalankan native SPAKE2 harness, unit Android, build, dan npm audit.

Untuk development panel, dari `source/cloudflare` jalankan `npm run dev`. Proses itu harus dimulai ulang pada task baru. `node scripts/smoke-local.mjs` dari root memverifikasi owner login, registry terautentikasi, dan penolakan anonymous. Jangan bagikan URL localhost sebagai preview onboarding. Password test ada di file `.dev.vars` yang ignored; gunakan hanya untuk dev. Anda dapat menyetel password test milik sendiri di file itu melalui editor lokal, tanpa mengirimnya ke chat.

Build ulang: `bash scripts/build-android.sh`. Release: sediakan `BRIDGE_SIGNING_STORE`, `BRIDGE_SIGNING_ALIAS`, `BRIDGE_SIGNING_PASSWORD`, `BRIDGE_SIGNING_KEY_PASSWORD` melalui secure CI/local environment lalu `bash scripts/build-android.sh release`. Jangan commit private key. Untuk build komputer selain cloud, gunakan Android SDK/NDK/JDK yang sama, `ANDROID_HOME`, dan Gradle wrapper dengan checksum pinned. Set `BRIDGE_DEBUG_STORE` bila home tidak writable.

`python scripts/package-deliverable.py` membuat ZIP dan manifest. Kecualikan semua cache, `.git`, `.dev.vars`, private material dan configuration lokal. Checksum membuktikan integritas, bukan authenticity/sertifikasi. Byte-identical APK belum dibuktikan: debug key dan metadata build dapat berbeda antar mesin.

# Penghubung Chrome — mulai di sini

**0.1.0: DEVICE_VALIDATION_PENDING, DEPLOYMENT_PENDING, SIGNING_PENDING.** Ini hasil source dan APK debug yang dapat dibangun, belum produk dengan seluruh gate fisik lulus.

Repo dibangun ulang dari brief ZIP. Source lama tidak dipakai. Satu APK mengintegrasikan ADB TLS/SPAKE2, discovery port, koneksi Chrome DevTools, agent, foreground service, notifikasi, dan popup overlay. Backend menyediakan panel pemilik, enrollment sekali pakai, MCP Streamable HTTP, OAuth PKCE, scope perangkat, serta journal aksi durable. Runtime ponsel tidak membutuhkan Termux, npm daemon, root, atau helper APK.

Yang harus dibuktikan selanjutnya: pairing/discovery pada Android 12 fisik termasuk port berubah, Chrome Android/screenshot end-to-end, overlay, update APK, lifecycle dan 60 menit ketahanan, dua ponsel nyata, deployment akun sendiri, serta client ChatGPT/Codex target. Harness Linux dan MCP SDK Node bukan pengganti bukti tersebut. Semua batas spesifik ada di [laporan](evidence/VERIFICATION.md).

1. Baca [tutorial instalasi](docs/INSTALASI.md) dan [izin dan risiko](docs/KEAMANAN.md).
2. APK pengujian ada di `dist/android/phone-browser-bridge-0.1.0-debug.apk`, beserta checksum dan fingerprint signer publik. Tidak ada private signing key di distribusi. Gunakan ponsel test Android 12, jangan menganggapnya release produksi.
3. Siapkan endpoint Cloudflare pada akun Anda sendiri memakai [panduan](docs/CLOUDFLARE.md). Source/config dan bundle worker ada di `source/cloudflare/` dan `dist/cloudflare/`.
4. Di panel milik Anda buat token enrollment, daftarkan APK, lalu pairing Wireless Debugging secara manual dari ponsel itu sendiri. Port pairing bukan port koneksi. Tampilkan popup hanya setelah izin overlay diberikan.
5. Hubungkan client MCP yang mendukung OAuth PKCE dan Streamable HTTP. Pilih perangkat secara eksplisit. Tab pengendali ChatGPT dilindungi; password tidak bisa diketik melalui tool. Isi halaman adalah data tidak dipercaya.
6. Jalankan [prosedur perangkat](docs/UJI_PERANGKAT.md) sebelum mengubah status pending.

Untuk developer cloud: `bash scripts/cloud-setup.sh` lalu baca [pengembangan](docs/PENGEMBANGAN.md). Upload ZIP ke chat tidak otomatis memberikan akses Cloudflare, perangkat Android, secret, atau tools deployment. Periksa kemampuan yang tersedia dan lakukan langkah akun/izin manual ketika dibutuhkan. Source, APK, checksum, tutorial, lisensi, evidence, dan manifest adalah bagian ZIP hasil ini; brief asli ada di `docs/brief/`.

# Mulai dari sini

Paket prompt mandiri untuk membangun Phone Browser Bridge dari nol. Target pertama Android 12. Versi brief 1.0, 7 Oktober 2026.

**Paket ini berisi instruksi dan spesifikasi, belum berisi aplikasi, APK, atau server yang sudah dibuat.** ZIP hasil pembangunan nanti berbeda dari ZIP prompt ini.

1. Ekstrak seluruh ZIP ke workspace Codex yang baru/kosong. Jika antarmuka menyediakan unggah file dan ekstraksi, gunakan itu; jika tidak, ekstrak sendiri lalu masukkan foldernya ke workspace/repo baru.
2. Kirim isi `PROMPT_KIRIM_KE_CODEX.txt` ke Codex. Pastikan Codex benar-benar dapat membaca file dalam folder ini. Jangan hanya memberikan nama ZIP tanpa akses ke isinya.
3. Codex membaca `01_PROMPT_UTAMA_CODEX.md`, `AGENTS.md`, dan seluruh spesifikasi sebelum implementasi. Konteks percakapan sebelumnya tidak dibutuhkan.
4. Sediakan akses akun Cloudflare milik pemilik instalasi jika akan melakukan deployment. Izin Android dan pengujian perangkat fisik tetap memerlukan pemilik perangkat. Prompt tidak menciptakan akses akun, alat, atau izin sistem.
5. Ikuti pembaruan Codex sampai hasil build, deployment, dan pengujian dinyatakan dengan bukti. Jika perangkat fisik belum tersedia, hasil harus berstatus menunggu verifikasi perangkat.

Tidak perlu mengkloning repo lama. Laporan lama sudah dibundel sebagai bukti masalah yang harus dihindari. Dokumentasi SDK/platform resmi boleh diverifikasi saat membangun; maksud “dari nol” adalah tanpa ketergantungan pada proyek lama atau ingatan chat.

## Isi paket

- `01_PROMPT_UTAMA_CODEX.md`: perintah lengkap untuk eksekusi pembangunan.
- `spec/`: kebutuhan, arsitektur, lifecycle Android, browser, keamanan, dan Cloudflare.
- `workflow/`: urutan kerja, penggunaan sumber daya, serta cara handoff.
- `context/`: temuan dan laporan pengujian historis.
- `verification/`: gate pengujian, skenario, serta format bukti.
- `templates/`: konfigurasi contoh dan catatan status untuk proyek baru.
- `sources/`: rujukan primer dan batas fakta teknis.
- `tools/verify_pack.py` dan `MANIFEST.json`: pemeriksaan integritas paket ini.

Jangan menaruh token atau kata sandi asli di paket yang akan dibagikan. Setiap penerima memakai akun Cloudflare, kunci, dan perangkat sendiri.

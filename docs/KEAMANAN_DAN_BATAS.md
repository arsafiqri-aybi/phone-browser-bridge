# Akses dan batas

- Relay memakai OAuth Authorization Code + PKCE S256. Audience hanya endpoint MCP ini. Token akses 1 jam dapat diperbarui; sesi kendali APK tidak memiliki timer durasi. Refresh token berotasi, memiliki masa berlaku, dan penggunaan ulang mencabut keluarga token. Ini keamanan koneksi, bukan jatah menit browser.
- Password pemilik disimpan di Cloudflare hanya sebagai PBKDF2 hash. Token perangkat disimpan sebagai SHA256 hash. Server native lokal memerlukan token APK yang berbeda. Admin memakai cookie HttpOnly dan verifikasi Origin/CSRF.
- Koneksi perangkat keluar melalui TLS. DevTools 9222 dan APK 8765 hanya loopback. Tidak ada tool remote shell/ADB, root atau pembuka kunci.
- DevTools mengendalikan isi halaman. Chrome UI seperti pengaturan, download, permission prompt, dialog upload sistem, DRM, iframe lintas origin, CAPTCHA, dan dialog Android mungkin memerlukan pemilik. Snapshot saat ini berfokus pada dokumen utama; JavaScript bersifat eksplisit, bukan eksekusi instruksi website secara otomatis.
- Screenshot dan teks halaman dikirim melalui relay ke ChatGPT ketika diminta. Jangan meminta membuka konten rahasia yang tidak ingin dibagikan. Password input tidak dibaca snapshot; isi website bisa memuat informasi pribadi lain.
- Upload dibatasi folder `MEDIA_ROOT` pilihan pemilik, realpath diperiksa terhadap symlink, maksimum 50 MB per file dan 10 file per panggilan. Keberhasilan upload ke input bukan bukti posting selesai.
- Jurnal tidak menyimpan teks prompt/credentials/hasil halaman, hanya hash perintah dan status. Timeout setelah tindakan bisa membuat hasil tidak diketahui; jurnal mencegah pengulangan otomatis yang berisiko. Cadangkan `.env` dan jurnal secara privat bila memindahkan agen; jangan jalankan dua agen pemilik sekaligus.
- Pause/revoke dan Origin/auth tetap diperlukan meskipun pemilik meminta akses luas. Domain ChatGPT dilindungi dari tool halaman untuk menghindari mengendalikan percakapan sendiri.
- Cloudflare, ChatGPT dan Android punya batas layanan/perangkat. Paket ini menghapus timer kendali aplikasi dan penggunaan browser cloud berbayar per menit; tidak menghapus batas eksternal tersebut.

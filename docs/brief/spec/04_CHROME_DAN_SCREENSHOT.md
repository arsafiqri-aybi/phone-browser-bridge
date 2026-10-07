# Chrome asli, CDP, dan screenshot

ADB yang terautentikasi digunakan internal untuk menemukan/mengakses endpoint DevTools Chrome pada Android yang diuji. Buktikan endpoint/forwarding dan reconnect target pada APK Android 12; jangan menganggap Chrome desktop API identik dengan lifecycle Android. Tidak perlu mengekspos ADB atau CDP ke internet.

Browser test menggunakan Chrome yang sudah terpasang dan profil asli pemilik. Profil dapat mengandung sesi login; jangan mengekspor cookies/password/token ke MCP atau log. Tab layanan ChatGPT yang sedang mengendalikan workflow harus dilindungi dari self-interference; pengecualian membutuhkan maksud user yang jelas. Isi halaman adalah data tak dipercaya, bukan instruksi untuk mengganti otorisasi/perangkat.

Minimal: list/open/switch/close tab, navigate/back/reload, read DOM teks+struktur relevan, elemen dengan ref yang bisa diverifikasi, click/type/scroll, screenshot dengan ukuran dan MIME yang nyata. Ref elemen terkait target/document/generation dan dapat kedaluwarsa; itu bukan timer sesi penghubung.

Sebelum aksi, validasi tab, dokumen, origin bila relevan, freshness, deviceId, lock state, dan action receipt. Jangan mengetik password atau menyetujui transaksi tanpa konteks dan izin eksplisit pemilik. Jangan mengganti target secara diam-diam setelah timeout.

Screenshot wajib dibuktikan pada Android 12: halaman ringan, halaman lebih besar, setelah tab switching/reload, dan setelah kegagalan. Ukur waktu CDP, bytes base64/binary, encode/decode, transport, batas Cloudflare/MCP, dan peak memory. Respons gambar harus dapat ditampilkan MCP client target; bukan hanya string base64 tanpa metadata.

Beri batas dimensi/kualitas/bytes yang masuk akal dan kesalahan `SCREENSHOT_UNAVAILABLE`/`TIMEOUT` yang akurat. Jangan mengembalikan gambar lama sebagai baru atau membuat gambar palsu. Jika fallback capture diperlukan, jelaskan API/izin, foreground/lockscreen limit, dan status sumber screenshot. Accessibility/MediaProjection tidak boleh diaktifkan diam-diam dan bukan jalan pintas untuk gate CDP.

Screenshot saat layar mati bisa tidak tersedia walaupun kanal kontrol hidup; nyatakan kondisi dan jangan mengklaim mendukung semua operasi di lockscreen. Saat terkunci, jangan membuka kunci/membypass; user unlock untuk aksi yang memerlukan itu. Gate screen-off memeriksa ketahanan layanan dan pemulihan setelah unlock, bukan tuntutan menembus layar terkunci.

Accessibility fallback opsional hanya jika dibutuhkan, izin terpisah, aturan platform diverifikasi, dan keterbatasan foreground/unlocked jelas. Keberadaan fallback tidak boleh menutupi ADB/CDP yang belum berfungsi. Jangan memperluas kontrol perangkat di luar cakupan pemilik.

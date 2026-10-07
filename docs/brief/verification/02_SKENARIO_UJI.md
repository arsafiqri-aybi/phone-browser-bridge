# Skenario uji penting

## Pairing/reconnect/update

Instalasi bersih, tanpa Termux/helper: consent → pairing6digit manual → connect → close app UI → reopen tanpa pairing. Restart Wireless Debugging dengan trust tetap valid hingga port berubah; app mendeteksi ulang dan connect tanpa key baru. Uji Wi-Fi hilang/kembali dan stale mDNS. Uji key dicabut, debug off, data clear: menampilkan tindakan owner, tidak brute-force pairing. Update APK dengan applicationId+signature sama: key/deviceId/config bertahan. Berbeda signature tidak boleh dianggap update sukses.

## Lifecycle/overlay

Izinkan/deny overlay; popup di atas Chrome/Settings bila OS mengizinkan; drag/collapse/dismiss; service tetap aktif. Denied tidak crash. Jangan menutup permission button. Screen off/unlock, swipe Activity dari recents, vendor restrictions bila perangkat memilikinya. Pause menolak aksi; Stop melepaskan service/socket/wake lock dan tidak auto restart oleh supervisor. Force-stop dihormati; setelah owner buka/resume, pulih sesuai kondisi trust.

## Screenshot dan health

Halaman ringan yang sama, screenshot berulang 15 menit, DOM ready, tab switch/reload. Ukur screenshot bytes/latency/heap/pending. Injeksi capture hang/error/oversize tanpa memutus heartbeat/control. Sesudah timeout, status/read/navigation pulih dan pending map bersih. Jangan menerima response screenshot stale dari target lama. Uji dimensi/MIME/decode/client display. Uji layar mati terpisah dan laporkan unavailable jujur bila renderer tak menyediakan capture.

## Transport dan queue

Putus relay saat command read; reconnect generation baru. Putus setelah mutasi dikirim tetapi sebelum ack: journal outcome UNKNOWN; retry actionId sama tidak menggandakan. Deadline habis saat masih antre → aksi tidak berjalan. Queue penuh → bounded overload error. Device offline tetap dipilih. Late response dari sesi lama ditolak. Control/heartbeat tidak menunggu screenshot lambat. Listener/socket worker error pulih tanpa mematikan owner intent.

## Isolasi dan auth

Owner A tak bisa mengakses status/hasil/commands owner B. Device token A tak bisa register sebagai B. Client scoped A tak bisa target B. Enrollment replay/expired ditolak. Revoke device memutus command access dan reconnect token lama ditolak. Tokens tidak dicetak. Uji auth expiry/refresh legal terpisah dari service lifetime. Restart server tidak menghapus durable dedupe safety.

## Input dan privasi

Payload besar/malformed, unsupported method, shell metacharacter pada input, URL/path injection, replay beda payload, script website yang menyuruh pindah perangkat/curi token. Semua ditolak/dibatasi sesuai kontrak. Diagnostic export tidak memuat password, cookies, auth header, private key, halaman/login URL sensitif. Uji stop/revoke dari notifikasi/panel dengan perilaku jelas.

## Distribusi dan onboarding

Fresh unzip ke workspace baru → baca tutorial → build → akun/config sendiri → deploy bila auth ada → APK bersih → pairing → MCP smoke. Tidak ada alamat/credential pemilik lama; tidak ada npm/Termux daemon runtime. Perintah docs cocok skrip. Jika suatu tahap tidak dapat dijalankan, catat langkah yang benar-benar diperiksa dan NOT_RUN sisanya.

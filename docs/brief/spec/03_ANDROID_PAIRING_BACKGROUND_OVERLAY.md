# Android 12: pairing, background, dan popup

## Pairing bukan koneksi permanen

Wireless Debugging memakai pairing untuk memasukkan identitas public key yang dipercaya. Port pairing berbeda dari port koneksi. Koneksi baru memakai TLS dan endpoint yang bisa berubah. `_adb-tls-pairing._tcp` untuk setup; `_adb-tls-connect._tcp` untuk koneksi setelah dipercaya. Jangan mendasarkan reconnect pada port pairing lama atau fixed serial IP:port.

Simpan private key/identity di penyimpanan privat terlindungi; gunakan Android Keystore untuk melindungi material bila integrasi client memungkinkan. Kunci jangan diekspor di log/backup/ZIP. Bind discovery pada perangkat yang sudah dipair dan instalasi yang benar; nama service/GUID saja bukan autentikasi tanpa trust TLS. Catat validasi host/device identity secara nyata.

Android NSD/mDNS dan client embedded harus diuji dari APK pada perangkat itu sendiri. Dokumentasi auto-connect ADB host di komputer tidak otomatis membuktikan self-device ADB. Verifikasi interface/IP berubah, stale service, IPv4/IPv6 bila relevan, jaringan tanpa mDNS, serta koneksi pertama setelah pairing ketika announcement sudah pernah muncul. Endpoint manual boleh menjadi pemulihan terbatas dengan penjelasan; itu bukan pengganti gate otomatis saat port berubah.

Saat Wi-Fi hilang, debug mati, OS menonaktifkan debug, authorization kedaluwarsa, key dicabut, aplikasi dihapus/data direset, atau jaringan menghalangi discovery, tampilkan keadaan dan langkah pemilik yang sesuai. Jangan mengarang bahwa user intent ikut mati karena probing gagal. Jangan mereset key untuk setiap reconnect.

## Foreground lifecycle

- Start dari tindakan user yang terlihat, segera masuk foreground sesuai batas Android 12, gunakan service type/permission yang sesuai versi target dan kebijakan aktual.
- Notification memberi status serta Pause/Resume/Stop. Pemilik mengerti layanan aktif dan cakupannya.
- Persist owner intent dan rekonsiliasi restart; service start/restart tidak berarti izin selalu tersedia.
- Supervisor memulihkan transport yang gagal tanpa menunggu pengguna mengetik perintah. Bounded backoff+jitter, offline event driven, reset ketika kondisi berubah.
- Partial wake lock hanya bila dibutuhkan, dengan ownership, release di semua jalur, dan telemetry durasi. Tidak boleh sekadar menahan CPU sepanjang waktu tanpa alasan yang diuji.
- Doze, pembatasan vendor, battery optimization, screen off, Chrome suspension, dan reboot diuji serta diberi batas hasil. Pengaturan baterai boleh dipandu dengan consent, tidak dibypass.
- Jangan mengandalkan START_STICKY sebagai jaminan hidup. Android force-stop dan revocation dihormati; tidak ada mekanisme yang diam-diam menghidupkan layanan setelah owner Stop.
- Reboot recovery hanya sejauh OS mengizinkan dan owner intent masih aktif. Jika memerlukan tap untuk melanjutkan, katakan secara jelas.

Pause menghentikan penerimaan/dispatch aksi dan kerja mahal; boleh mempertahankan metadata kontrol sesuai desain yang dijelaskan. Stop menutup koneksi, melepaskan wake lock, menghentikan service/notifikasi, dan menyimpan intent stopped. Resume adalah tindakan owner yang memeriksa kembali izin. Closing Activity/popup tidak sama dengan Stop.

## Overlay

Gunakan `TYPE_APPLICATION_OVERLAY` dengan izin `SYSTEM_ALERT_WINDOW` yang diberikan manual. Popup bisa dipindah, diperkecil, dibuka kembali, dan ditutup. Tampilkan koneksi, pairing input, Pause/Resume/Stop; tidak perlu split screen atau Termux.

Jangan menutup tombol permission/security, menyadap input aplikasi lain, mengautoklik dialog izin, atau meniru dialog sistem. Layar tertentu dapat menyembunyikan overlay. Jika Settings pairing menyembunyikannya, sediakan alur kembali ke aplikasi/notifikasi tanpa menyatakan overlay wajib bekerja di semua layar.

Permission flow dari instalasi bersih harus jelas dan tidak berulang tanpa alasan. Overlay ditolak tidak boleh crash; sediakan UI biasa, tetapi catat gate fitur overlay belum dipenuhi sampai benar-benar diuji dengan izin.

## Pembaruan APK

Application ID, release signing identity, dan storage migrations stabil. Update dengan signature yang sama mempertahankan key, deviceId, owner intent, dan konfigurasi; jalankan test update versi nyata. Uninstall/data clear berbeda dan bisa menghapus pairing key. Server upgrade menjaga kompatibilitas protokol selama transisi atau memberi tindakan migrasi jelas. Jangan menyembunyikan perubahan hak akses dalam auto-update.

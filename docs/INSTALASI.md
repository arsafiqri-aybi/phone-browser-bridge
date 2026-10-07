# Pasang dan pakai di Android 12

Pakai APK debug untuk pengujian pada perangkat milik Anda. Verifikasi SHA256 terhadap `dist/android/debug-sha256.txt`. Signing debug bukan identitas produksi dan private debug key tidak didistribusikan. Build baru dengan debug key berbeda tidak dapat mengupdate APK sebelumnya; untuk update stabil pemilik harus memakai release key sendiri.

1. Siapkan server milik Anda sesuai CLOUDFLARE.md; buka panel HTTPS dan login owner.
2. Buat token pendaftaran satu kali (5 menit). Pasang APK, baca cakupan ADB, isi endpoint HTTPS root server Anda, token dan alias perangkat, lalu tap Daftarkan perangkat. Ini belum pairing ADB.
3. Aktifkan Developer Options → Wireless Debugging pada Android 12. Sambungkan ke Wi-Fi yang sesuai. Buka dialog Pair device with pairing code. Catat port pairing dan kode 6 digit; kode bersifat sementara. Masukkan di aplikasi atau popup dan tap Pairing ponsel ini. Aplikasi menghubungi loopback ponsel sendiri; tidak mengontrol ponsel lain di Wi-Fi.
4. Setelah pairing, aplikasi menemukan `_adb-tls-connect._tcp` yang berasal dari interface ponsel itu sendiri dan mencoba port lokal dengan trust tersimpan. Port koneksi dapat berubah; tidak ada janji fixed port. NSD self-device, pin certificate dan reconnect masih memerlukan pembuktian fisik G1.
5. Berikan izin Draw over other apps secara manual bila menginginkan popup. Popup draggable, bisa diperkecil dan ditutup. Overlay dapat disembunyikan Android di Settings/dialog keamanan: kembali ke aplikasi lewat notifikasi untuk pairing jika perlu. Izin ditolak memakai UI biasa.
6. Buka Chrome asli dan halaman test `https://example.com`. Tap Lanjut. Notifikasi foreground menyediakan Jeda, Lanjut, Stop, Popup. Tutup Activity/popup tidak memerintahkan Stop.
7. Hubungkan MCP ke server Anda, izinkan perangkat terpilih melalui OAuth, panggil devices → select_device → status → tabs → read/screenshot. Tidak ada fallback ke ponsel yang kebetulan online.

Pemakaian harian: bila intent active, OS/trust/jaringan masih mengizinkan, supervisor mencari ulang koneksi yang hilang. Sesudah Stop/Pause, gunakan tindakan Lanjut milik owner. Force-stop, debugging dimatikan, key dicabut, uninstall/data clear, Wi-Fi tanpa discovery atau layar terkunci dapat membutuhkan tindakan owner. Tidak ada bypass OS, unlock, atau pengaktifan izin otomatis. Tidak memakai wake lock terus-menerus; screen-off/Doze masih pending test.

Jeda menolak dispatch dan kerja browser/capture; heartbeat metadata boleh tetap hidup. Stop menyimpan intent stopped dan menutup service/socket/notifikasi. Cabut perangkat melalui panel untuk mematikan akses remote; lupakan pairing lokal setelah Stop lalu hapus key juga di Wireless Debugging Android. Izin ADB lebih luas dari Chrome walaupun APK memakai allowlist.

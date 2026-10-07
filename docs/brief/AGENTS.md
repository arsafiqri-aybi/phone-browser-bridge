# Instruksi workspace untuk Codex

Berlaku untuk paket brief dan proyek baru yang dibuat darinya. Instruksi pemilik terbaru mengungguli dokumen ini.

1. Baca `01_PROMPT_UTAMA_CODEX.md` dan `spec/` sebelum implementasi. Buat source baru; jangan mengimpor source lama.
2. Jangan mengubah file brief demi melonggarkan gate. Catat perubahan kebutuhan pemilik dan versi kontrak secara eksplisit.
3. Android 12, tanpa Termux, satu APK, Chrome ponsel asli, pairing awal manual, discovery port otomatis, overlay, izin pemilik, multi-device isolation adalah batas wajib.
4. Simpan source proyek dalam folder baru seperti `phone-browser-bridge/`. Jangan menghapus karya lain. Jangan commit private key/token/signing material.
5. Gunakan dokumentasi primer saat memastikan API/dependency. Bedakan fakta, hipotesis, dan hasil test. Catat versi yang benar-benar dipakai.
6. Gunakan antrean terbatas, deadline menyeluruh, heartbeat independen, journal untuk aksi, recovery per lapisan, dan status yang menyatakan `unknown` saat tidak diketahui.
7. Tindakan yang mungkin sudah dieksekusi tidak boleh diputar ulang otomatis. Gunakan action ID dan payload digest; outcome ambigu adalah `UNKNOWN`, bukan alasan retry mutasi.
8. Jangan membuktikan Android dengan test desktop. Catat `PASS`, `FAIL`, `UNCERTAIN`, atau `NOT_RUN` beserta lingkungan dan bukti.
9. Hormati kontrol Pause/Stop dan revocation. Jangan bypass permission dialogs, force-stop, lockscreen, atau kebijakan browser/perangkat.
10. Hindari serialisasi panjang yang menghambat health. Jangan logging isi halaman, cookies, password, atau URL sensitif tanpa persetujuan diagnostik terpisah.
11. Gunakan alat yang tersedia; tidak ada tuntutan mengakses akun yang belum tersedia. Prompt tidak mengizinkan mengirim pesan kepada pihak lain.
12. Kerjakan mandiri; delegasi/subagent hanya jika pengguna atau instruksi runtime mengizinkan secara eksplisit.
13. Perbarui `PROJECT_STATE.md` dan evidence setelah gate penting. Kemas hanya hasil yang nyata, bukan template evidence yang dianggap bukti.

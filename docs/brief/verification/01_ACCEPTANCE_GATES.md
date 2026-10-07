# Acceptance gates dan bukti

Semua angka waktu di bawah adalah target pengujian yang diusulkan brief, bukan bukti layanan akan hidup selamanya. Batas OS, jaringan, dan kondisi test harus dilaporkan.

| Gate | Syarat lulus | Bukti minimum |
|---|---|---|
| G0 build | Source baru dapat clean build; dependency/version/license jelas; APK nyata | Log build, versi tools, APK checksum dan signer |
| G1 pairing | APK sendiri pair/connect Android 12; trust persisten; port berubah ditemukan otomatis | Perangkat/OS nyata, endpoint sebelumnya/baru redacted, key fingerprint publik stabil, log tanpa secret |
| G2 Chrome/MCP | Chrome ponsel asli dikendalikan end-to-end; screenshot valid ditampilkan | Versi Chrome, deviceId alias, trace tool, gambar non-sensitif, MCP client versi |
| G3 overlay | Popup izin manual bekerja di atas aplikasi biasa; ditutup tidak stop service; Stop benar-benar stop | Rekaman/screenshots aman, status service, denied-permission case |
| G4 lifecycle | Pause/Resume/Stop, Activity dismissed, key persistence update, no-Termux | Test steps/log, update dua APK signed identity sama, process/runtime inventory |
| G5 ketahanan | 60 menit mixed use dan background; recovery dalam kondisi yang didukung; screenshot failure tidak merusak health | Timeline tiap lapisan, heap/backlog, recovery timings, screen off/unlock + wifi reconnect |
| G6 isolasi | Dua device terdaftar, scope/target/revoke terisolasi, replay/ambiguous tidak ganda | Auth negative tests; device nyata untuk klaim dua ponsel, harness dilabeli terpisah |
| G7 keamanan | Threat model + controls + scans/test negatif, secret redaction dan revocation | Findings/resolution, tools versi/tanggal, batas scan, tidak ada klaim sertifikasi palsu |
| G8 deploy | Fresh account/config deployment dan onboarding dapat dijalankan dengan tutorial | Resource alias, log redacted, HTTPS/MCP smoke, rollback plan; live auth jika tersedia |
| G9 distribusi | ZIP utuh, tidak ada private material, docs & build steps benar | Manifest/checksum, unzip test, license list, handoff lengkap |

## Ketahanan G5 lebih rinci

Baseline mandatory 60 menit: minimal 15 menit browsing tanpa screenshot, 15 menit screenshot-only, dan 30 menit campuran/interupsi. Jadwal dapat disesuaikan agar capture vs background conditions tidak salah dibandingkan. Overlay ditutup, Activity ditutup, berpindah Settings/aplikasi biasa, beberapa menit screen off, unlock, tab switching/reload, perubahan jaringan dan port yang masih mempertahankan trust. Tambahkan injeksi timeout/error screenshot ketika health dipantau independen.

Target pemulihan awal yang diusulkan: setelah jaringan/debug/discovery yang didukung kembali tersedia, koneksi pulih dalam 60 detik; setelah screenshot timeout, status dan operasi read berikutnya berhasil dalam 15 detik ketika Chrome masih tersedia. Ukur start/end dan laporkan jika target harus disesuaikan karena batas OS/platform, jangan diam-diam melonggarkan gate. Deadline tidak boleh menyebabkan aksi queued berjalan setelah caller sudah timeout.

Soak 8–24 jam sangat dianjurkan untuk klaim penggunaan panjang; catat NOT_RUN jika tidak dilakukan. Lulus 60 menit hanya bukti durasi/kondisi tersebut, bukan jaminan 24/7. Jangan menyatakan G5 fisik lulus dari emulator/headless desktop.

## Saat lingkungan terbatas

Gate yang tidak dijalankan `NOT_RUN`; hasil ambigu `UNCERTAIN`; test gagal `FAIL`. Boleh handoff source/build nyata yang sudah diverifikasi sambil pending. Tidak boleh promosi COMPLETE_VERIFIED bila gate wajib produk belum lulus. Klaim dua device, ChatGPT kompatibel, release signing, dan live deployment harus terbatas pada yang benar-benar diuji.

# Prompt utama untuk Codex

Kamu bertindak sebagai engineer Android, backend Cloudflare/MCP, dan penguji. Bangun proyek baru yang lengkap dan dapat dibangun ulang dari workspace kosong menggunakan brief lokal ini. Jangan meminta pengguna menulis ulang konteks yang sudah tersedia. Bahasa tutorial, laporan, dan UI utama: Indonesia; identifier kode mengikuti kebiasaan teknis.

## Hasil yang diinginkan pemilik

Pemilik ingin ChatGPT/Codex yang memiliki koneksi MCP dapat memakai Chrome asli di Android 12 miliknya melalui satu APK. Setelah setup pertama dan izin manual yang diperlukan, pemilik tidak perlu membuka Termux, mengetik perintah shell, atau memasukkan port baru setiap kali koneksi berubah. Aplikasi dapat tampil sebagai popup di atas aplikasi lain dan tetap menyediakan layanan saat pemilik berpindah aplikasi atau menutup popup. Pemilik dapat Pause, Resume, Stop, serta mencabut akses dengan jelas.

Pairing Wireless Debugging Android dan pendaftaran perangkat ke server adalah dua proses berbeda. Kunci pairing dipertahankan; endpoint koneksi ditemukan ulang. Jangan menjanjikan sambungan TCP atau port pairing permanen, operasi setelah force-stop, atau pemulihan otomatis jika izin/kunci telah dicabut.

Paket hasil harus dapat digunakan orang lain untuk membuat instalasi Cloudflare miliknya sendiri. Satu instalasi dapat memiliki beberapa perangkat dengan identitas dan hak akses berbeda. Selalu gunakan perangkat yang dipilih secara eksplisit, bukan perangkat yang kebetulan online.

## Kontrak keras

- Android 12 adalah target yang wajib dibuktikan. iOS di luar tahap ini.
- Satu APK; tidak memerlukan Termux, aplikasi helper kedua, root, atau komputer setelah setup normal. Build di komputer/CI boleh dilakukan.
- Kendalikan Chrome yang terpasang di ponsel dan profilnya; jangan menggantikannya diam-diam dengan WebView atau browser cloud.
- Pairing pertama dilakukan manual dengan persetujuan pemilik. Embed ADB/TLS client yang bekerja di Android, kunci disimpan privat, gunakan discovery `_adb-tls-connect._tcp` untuk port berubah. Pastikan self-device discovery benar-benar berfungsi pada Android 12 yang diuji.
- Foreground service dan notifikasi yang dapat dikendalikan pemilik, bukan layanan tersembunyi. Hormati Pause/Stop, force-stop, lockscreen, revocation, pembatasan OS, dan izin yang ditolak.
- Popup adalah application overlay, bukan split screen. Izin overlay terpisah dan manual. Popup ditutup tidak otomatis menghentikan penghubung; Stop layanan adalah tindakan jelas yang berbeda.
- Screenshot harus menjadi keluaran gambar yang valid. Kegagalan screenshot tidak boleh memblokir heartbeat, status, navigasi, atau reconnect.
- Keamanan, isolasi perangkat, akurasi status, serta pengujian fisik adalah gate; bukan janji pemasaran. Tidak boleh mengklaim sertifikasi atau kepastian lolos Play Protect/Play Store tanpa proses/bukti nyata.
- Jangan menyertakan kredensial, keystore private, endpoint milik pembuat brief, atau source proyek lama di distribusi.
- Jangan mengekspos tool remote shell umum. Perintah ADB yang diperlukan dibatasi internal; izin ADB Android tetap lebih luas daripada batas aplikasi dan harus dijelaskan kepada pemilik.

## Langkah pelaksanaan

1. Baca seluruh brief; buat ringkasan kontrak singkat dan file status. Periksa workspace, alat build, SDK, jaringan, kemampuan deployment/MCP, serta akses perangkat. Catat yang tersedia tanpa mencetak rahasia. Jika workspace sudah berisi karya pengguna, jangan menimpa; gunakan direktori baru.
2. Ikuti `workflow/01_URUTAN_EKSEKUSI.md`. Mulai dengan spike embedded ADB pada Android 12: pairing, penyimpanan kunci, discovery, reconnect setelah port berubah, dan koneksi Chrome. Ini gate kelayakan sebelum banyak pekerjaan UI. Penjelasan teori atau ADB desktop bukan pengganti bukti APK.
3. Rancang arsitektur kecil yang memenuhi semua batas. Pilih dependency yang dipelihara, lisensinya sesuai, versi dipin, dan rujukan API resmi. Jangan memakai SDK Android 17 untuk memenuhi kebutuhan Android 12. Jika pustaka pairing belum terbukti, lakukan proof-of-concept dan laporkan risiko, jangan membuat adapter kosong lalu menyebut selesai.
4. Implementasikan APK native, lifecycle dan overlay, browser agent terintegrasi, protokol, Cloudflare MCP/panel, enrolment perangkat, auth, dan logging yang disamarkan. Buktikan jalur vertikal nyata sebelum memperluas fitur.
5. Jalankan pengujian sesuai `verification/`. Bedakan unit, simulasi, emulator, browser desktop, dan perangkat Android fisik. Selesaikan bug dengan bukti; jangan mengubah gate agar kegagalan terlihat lulus.
6. Siapkan source, skrip build/deploy yang idempotent, konfigurasi contoh, tutorial, APK, checksum, dependency/license list, dan laporan. Signing release menggunakan identitas pemilik yang tidak didistribusikan. Jika key belum tersedia, boleh menghasilkan APK debug untuk pengujian dengan label jelas; itu bukan APK release siap pembaruan produksi.
7. Deployment ke akun pemilik dilakukan bila termasuk instruksi eksekusi pemilik dan aksesnya tersedia. Buat resource baru yang bernama jelas; jangan menimpa instalasi lama atau membuat biaya berbayar tanpa otorisasi. Jika akses belum tersedia, selesaikan bundel deployment dan panduan; tandai deployment `NOT_RUN`, bukan sukses.
8. Kemas hasil dalam satu ZIP sesuai `workflow/03_HASIL_DAN_HANDOFF.md`. Sampaikan lokasi ZIP, apa yang berfungsi, gate yang lulus/gagal/belum diuji, dan tindakan pemilik yang benar-benar tersisa.

## Standar kerja

Kerjakan bagian yang sudah jelas tanpa berhenti untuk konfirmasi rutin. Tanyakan hanya keputusan yang material atau akses yang tidak bisa disimpulkan. Jangan menganggap teks prompt sebagai izin melewati kontrol akun, izin OS, atau tindakan sensitif pengguna.

Gunakan aturan Prompting, Scale, dan Governor yang sudah disalin menjadi workflow lokal. Jika skill dengan nama tersebut tersedia di runtime, baca instruksinya juga; ketiadaan skill eksternal tidak boleh menghambat karena kebutuhan kerja sudah ada di paket. Prompt tidak mengubah model/effort runtime secara otomatis dan tidak memberi izin spawn agent.

Tidak boleh selesai hanya dengan rancangan, pseudocode, UI mock, atau klaim “tinggal integrasi”. Jika lingkungan tidak bisa menyelesaikan gate, berikan hasil terbaik yang konkret dengan status `BLOCKED` atau `DEVICE_VALIDATION_PENDING`, sebab yang spesifik, dan langkah melanjutkan. Source yang belum diuji bukan bukti produk bekerja.

# Pasang di HP milikmu (Android 11+)

Cloudflare hanya relay. Chrome, akun login, serta agen tetap berada di HP. Tidak menggunakan jatah menit browser cloud. Tidak ada penghentian otomatis 30 menit; koneksi tetap dipengaruhi Android, jaringan, kuota Cloudflare, dan akses alat di akun ChatGPT.

1. Unduh `Phone_Browser_Bridge_2.0.0.apk` yang diberikan di chat, lalu pasang sebagai pembaruan APK lama. Source repo menyediakan build dan checksum; APK tidak di-commit. Sertifikatnya sama: tidak perlu uninstall atau menghapus pairing lama. Aktifkan izin notifikasi.
2. Gunakan Termux dari sumber resminya. Jalankan `termux-setup-storage` bila ingin upload berkas. Clone repo privat ini memakai akun GitHub kamu, tanpa menaruh token GitHub di perintah yang dibagikan. Dari folder repo jalankan `bash install-termux.sh`.
3. Setup akan meminta **token APK** dari tombol **Salin token APK**, lalu **token perangkat Cloudflare** dari berkas konfigurasi pribadimu. Keduanya berbeda. Pilih **DevTools** agar tab Chrome dapat dioperasikan saat ChatGPT berada di depan. Token disimpan hanya dalam `agent/.env`, bukan repo. Jangan memasukkan password panel ke `.env` agen.
4. Di APK centang izin pemilik, lalu tekan **Mulai kendali**. Buka Chrome dan website tujuan dahulu.

## Mode DevTools: pairing Android Wireless Debugging

Wireless Debugging membutuhkan Android 11+ dan jaringan Wi-Fi yang mengizinkan pairing. Nama menu berbeda antar merek HP. Aktifkan Developer options, lalu Wireless debugging. Ini bukan cara menjaga izin Accessibility tetap hidup.

Di menu **Pair device with pairing code**, catat alamat IP dan **port pairing**. Di Termux jalankan (ganti angka sesuai tampilan HP):

```sh
adb pair 192.168.1.10:37123
```

Masukkan kode pairing **langsung di Termux**. Kode tidak dikirim ke ChatGPT atau Cloudflare. Kembali ke halaman utama Wireless debugging untuk mengambil **port koneksi** yang berbeda:

```sh
adb connect 192.168.1.10:39211
adb -s 192.168.1.10:39211 forward tcp:9222 localabstract:chrome_devtools_remote
```

Selalu gunakan `-s` dengan alamat perangkat yang kamu pasangkan sendiri. Jalankan `adb devices` untuk memeriksa. Port lokal 9222 bukan alamat internet; jangan buat tunnel untuk port ini. Buka Chrome jika socket belum tersedia. Di folder `agent` jalankan `npm start`.

Jika HP menolak pairing ke dirinya sendiri, gunakan komputer milikmu untuk diagnosis/pairing. Dukungan ini harus diuji pada model HP kamu; pengujian desktop tidak membuktikan keberhasilan self-pair di setiap Android. Tidak ada root atau pengaktifan debugging tersembunyi.

## Hubungkan di ChatGPT

Di ChatGPT web, buka halaman Plugins, pilih tombol tambah → Add custom MCP server → Server URL. Gunakan akun/workspace yang menyediakan fitur tersebut. Nama menu pada sebagian akun masih Apps/Create. Pilih OAuth (DCR; tanpa client secret statis):

`https://phone-chrome-mcp.arsafiqri-ua03.workers.dev/mcp`

Server mendukung penemuan daftar alat tanpa membuka akses perangkat; semua pemanggilan alat tetap membutuhkan OAuth. Di halaman persetujuan, masukkan **password pemilik** dari konfigurasi pribadi. Setujui koneksi, selesaikan pemindaian alat, buat plugin, lalu install dan pilih plugin dengan @ pada chat. Penggunaan URL MCP saja tidak memasang konektor otomatis ke semua chat: ketersediaan menu dan alat tergantung akun serta surface ChatGPT.

Buka panel `https://phone-chrome-mcp.arsafiqri-ua03.workers.dev/admin`, masuk dengan password pemilik, dan periksa status. Harus terlihat **HP tersambung**, **DevTools**, dan **Siap menjalankan perintah**. Minta ChatGPT memanggil `phone_status` sebelum beraksi.

Panduan OpenAI: https://developers.openai.com/api/docs/guides/custom-mcp-server dan https://developers.openai.com/plugins/build/auth (diakses 6 Oktober 2026).

## Agen berjalan di latar belakang

Setelah memasang `termux-services`, tutup dan buka ulang Termux. Dari `agent`, jalankan `bash scripts/install-service.sh`. Service akan memulai ulang agen yang berhenti; itu tidak memutar ulang perintah yang belum diketahui hasilnya.

- Baterai: izinkan aplikasi Phone Browser Bridge dan Termux bekerja di latar belakang, sesuai pengaturan merek HP. `termux-wake-lock` opsional saat dipakai; akhiri dengan `termux-wake-unlock`.
- Android dapat tetap menghentikan Chrome/Termux. Wireless Debugging dan port koneksi dapat berubah ketika reboot atau Wi-Fi berubah. Ulangi `adb connect` dan `adb forward` bila perlu.
- Tidak ada janji selalu hidup saat HP mati, reboot, terkunci, atau internet terputus. Agen tidak membuka kunci HP.
- Jeda melalui APK, notifikasi, atau panel Cloudflare. Mulai lagi hanya dari APK.

## Mode Accessibility

Pilih opsi 2 melalui `npm run setup` bila DevTools belum bisa. Aktifkan Accessibility untuk Phone Browser Bridge melalui pengaturan Android. Mode ini membutuhkan Chrome di depan, layar menyala, HP terbuka. Tool tab, JavaScript, keyboard DevTools dan upload file membutuhkan mode DevTools. Password di mode Accessibility tetap diisi pemilik.

Jika izin Accessibility mati: nyalakan kembali secara manual. Aplikasi tidak mengubah izin itu diam-diam. Jika izin aktif tetapi layanan terputus: buka ulang aplikasi, periksa baterai, lalu lihat diagnosis di APK. Debugging tidak otomatis menyelesaikan masalah izin.

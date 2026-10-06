# Pasang di HP milikmu (Android 11+)

Cloudflare hanya relay. Chrome, akun login, serta agen tetap berada di HP. Tidak menggunakan jatah menit browser cloud. Tidak ada penghentian otomatis 30 menit; koneksi tetap dipengaruhi Android, jaringan, kuota Cloudflare, dan akses alat di akun ChatGPT.

1. Unduh `Phone_Browser_Bridge_2.1.0.apk` yang diberikan di chat, lalu pasang sebagai pembaruan APK lama. Source repo menyediakan build dan checksum; APK tidak di-commit. Sertifikatnya sama: tidak perlu uninstall atau menghapus pairing lama. Aktifkan izin notifikasi.
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

Gunakan [panduan tetap aktif](TETAP_AKTIF.md) atau panduan visual di https://phone-chrome-mcp.arsafiqri-ua03.workers.dev/guide. Hentikan agen foreground lama (Ctrl+C) sebelum memasang layanan.

```sh
cd agent
bash scripts/install-service.sh
chrome-bridge adb IP_HP:PORT_KONEKSI
chrome-bridge start
chrome-bridge status
```

Konfigurasi dan jurnal lama dipertahankan. Pengawas runit memulai ulang proses agen yang berhenti. Wake lock CPU aktif selama layanan diaktifkan. ADB connect/forward diperbaiki hanya untuk alamat HP yang pemilik simpan; jika port berubah, simpan alamat baru. Tidak ada tindakan browser yang diputar ulang otomatis.

Untuk berhenti dan tetap berhenti pada pembukaan shell/boot berikutnya:

```sh
chrome-bridge stop
```

Jeda kendali serta Hentikan penghubung lokal di APK. Mulai kembali dengan `chrome-bridge start`, lalu Mulai kendali di APK.

## Mode Accessibility

Pilih opsi 2 melalui `npm run setup` bila DevTools belum bisa. Aktifkan Accessibility melalui pengaturan Android. Chrome harus di depan, layar menyala, HP tidak terkunci. DevTools dapat mengendalikan isi tab saat aplikasi lain berada di depan; semua tindakan tetap ditolak saat HP terkunci.

Jika izin Accessibility mati, aktifkan manual. Debugging tidak mengunci izin Accessibility. Sistem Android, jaringan, reboot, force-stop dan tekanan memori tetap dapat membuat perangkat tidak tersedia. Perubahan ini harus diuji pada HP pemilik untuk membuktikan durasi dan kestabilannya.

# Chrome Bridge 2.1 — Tetap aktif sampai kamu berhenti

Panduan visual: https://phone-chrome-mcp.arsafiqri-ua03.workers.dev/guide

## Perbarui

Pasang APK 2.1 sebagai pembaruan; sertifikatnya telah dicocokkan dengan APK 2.0. Data aplikasi serta token APK dipertahankan. Dari folder repo Termux:

```sh
git pull --ff-only
bash install-termux.sh
```

Tutup sesi shell Termux lalu buka lagi setelah termux-services dipasang. Jika npm start lama masih berjalan, Ctrl+C sebelum memulai layanan.

## Atur HP

- Termux dan Chrome Bridge: Baterai → Tanpa pembatasan / Jangan optimalkan. Izinkan latar belakang, notifikasi, mulai otomatis jika ada.
- vivo/iManager: periksa pengelolaan baterai serta mulai otomatis. Kunci aplikasi pada recent apps bila tersedia. Nama menu bergantung versi HP.
- Chrome: izinkan latar belakang jika pengaturan tersedia. Hindari penghemat daya selama kendali aktif.
- Pertahankan Wi-Fi dan Wireless Debugging. CPU hold tidak memaksa layar menyala dan tidak membuka kunci HP. Mode aktif memakai daya tambahan.

## Nyalakan layanan

```sh
cd agent
bash scripts/install-service.sh
chrome-bridge adb IP_HP:PORT_KONEKSI
chrome-bridge start
chrome-bridge status
```

IP:port diambil dari halaman utama Wireless Debugging, bukan layar kode pairing. Agen memperbaiki ADB connect dan forward setiap siklus kesehatan jika DevTools tidak tersedia, hanya pada alamat yang kamu simpan. Ia tidak melakukan pairing atau memilih perangkat lain otomatis. Jika port berubah, ulangi chrome-bridge adb dengan port baru.

Di APK tekan Mulai kendali. Buka Chrome dan tab tujuan. Panel harus menyatakan Siap menjalankan perintah. Relay tersambung saja belum membuktikan Chrome siap.

## Setelah restart HP (opsional)

Pasang Termux:Boot dari sumber penandatangan yang sama dengan Termux, lalu buka sekali.

```sh
chrome-bridge boot-on
```

Android dapat mematikan Wireless Debugging / mengganti port setelah reboot. Aktifkan dan simpan port baru. Buka APK jika layanan lokal belum aktif. Script boot menghormati status berhenti layanan. Nonaktifkan pilihan ini dengan chrome-bridge boot-off.

## Hentikan

Jeda kendali di APK, notifikasi atau panel menghentikan izin tindakan. Penghubung masih tersedia untuk status. Mulai kendali kembali hanya dari APK.

Untuk mematikan agen dan mempertahankan status mati:

```sh
chrome-bridge stop
```

Pilih Hentikan penghubung lokal di APK. Untuk hidup lagi: chrome-bridge start lalu Mulai kendali di APK.

## Diagnosis

```sh
chrome-bridge logs
```

Jika agent tidak menjawab: periksa Termux, token APK, dan layanan lokal. Jika DevTools hilang: periksa port serta buka Chrome. Jika Accessibility dinonaktifkan: nyalakan manual. Signal 9 mengindikasikan proses dihentikan sistem, bukan timer sesi aplikasi. Tidak ada jaminan tanpa putus saat HP mati, force-stop, internet hilang, ataupun semua kebijakan vendor.

Rujukan resmi, diperiksa 6 Oktober 2026:
- https://github.com/termux/termux-services
- https://github.com/termux/termux-boot
- https://github.com/termux/termux-app
- https://developer.android.com/tools/adb
- https://developer.android.com/develop/background-work/background-tasks/awake/wakelock

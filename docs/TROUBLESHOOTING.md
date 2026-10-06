# Diagnosis berdasarkan status nyata

| Status | Tindakan pemilik |
| --- | --- |
| HP belum tersambung | Jalankan agen; periksa internet, URL Cloudflare, token perangkat |
| APK belum tersambung | Tekan Mulai di APK, pastikan token APK cocok dan port 8765 tersedia |
| Penghubung Chrome belum siap | Buka Chrome; periksa `adb devices`, port Wireless Debugging, dan ulangi forward 9222 |
| Kendali dijeda | Pemilik menekan Mulai dari APK; relay tidak dapat memulai diam-diam |
| Accessibility izin belum aktif | Aktifkan melalui pengaturan Android hanya jika memakai mode Accessibility |
| Accessibility izin aktif, layanan terputus | Periksa pembatasan baterai/auto-start merek HP, buka aplikasi dan sambungkan ulang layanan secara manual |
| Ref/screenshot kedaluwarsa | Ambil `phone_read`/`phone_screenshot` baru, jangan menebak target |
| Hasil tindakan belum diketahui | Baca halaman terlebih dahulu; jangan mengirim aksi publikasi berulang |
| Refresh OAuth dipakai ulang | Hubungkan ulang ChatGPT; seluruh keluarga token yang terdeteksi digunakan ulang dicabut |

Callback `onInterrupt()` sekarang hanya mencatat gangguan umpan balik. Callback itu tidak menjeda izin pemilik. Hilangnya layanan Accessibility tidak menjeda mode DevTools, tetapi semua tindakan tetap memeriksa APK dan izin pemilik.

Android 13+ dapat meminta izin **Allow restricted settings** untuk APK yang dipasang sendiri sebelum Accessibility dapat diaktifkan. Lakukan hanya setelah memeriksa aplikasi yang kamu pasang. Debugging mengaktifkan jalur DevTools; bukan jaminan Android tidak menghentikan Accessibility.

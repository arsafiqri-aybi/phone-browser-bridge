# Pemulihan yang sesuai keadaan

| Keadaan | Tindakan |
|---|---|
| Pairing gagal | Buka dialog pairing baru; kode 6 digit dan port pairing aktif. Jangan memakai port connect. Overlay dapat disembunyikan Settings; kembali ke aplikasi. |
| Discovery belum menemukan port | Pastikan Wireless Debugging aktif, Wi-Fi dan NSD self-device didukung. Tunggu announcement; verifikasi G1. Tidak ada fixed-port atau fallback perangkat asing. |
| Trust/pin berubah atau key dicabut | Pair ulang dengan persetujuan owner setelah investigasi; jangan mematikan verifikasi. Lupakan key lokal setelah Stop jika memang ingin reset trust. |
| Relay online, Chrome unavailable | Buka Chrome asli, unlock perangkat dan periksa ADB/debug. Status relay bukan bukti Chrome sehat. |
| Screenshot timeout | Periksa status/read pada target yang sama. Capture terpisah; tidak mengulang mutasi. Jangan memakai gambar lama sebagai baru. |
| UNKNOWN | Periksa receipt dan keadaan Chrome sebelum keputusan owner. Jangan mengirim aksi lagi dengan ID baru. |
| Device offline/paused | Pilihan device tetap. Owner Lanjut atau pulihkan koneksi yang sesuai; tidak pindah ke device online lain. |
| Credential expired/revoked | Revoke identitas lama dan enroll ulang melalui panel. Trust ADB tersimpan terpisah. Tidak ada bypass expiry. |
| JOURNAL_FULL | Tombstone dipertahankan demi anti replay. Owner perlu migrasi/identitas baru dengan review, bukan hapus tabel otomatis. |
| Debug APK tidak bisa update | Signature berbeda. Gunakan release key stabil milik owner; jangan mengklaim uninstall/reinstall mempertahankan pairing key. |
| OS membatasi service | Periksa notifikasi/intent dan pengaturan baterai dengan consent. Setelah reboot/force-stop owner mungkin tap Lanjut. Tidak ada jaminan 24/7. |

Log metadata `PhoneBridge` mencatat method, durasi dan generation saja. Jangan export browsing data atau credential. Dev Cloudflare memakai server lokal; koneksi dummy Request.cf yang gagal tidak membuktikan live deployment atau VPN gagal.

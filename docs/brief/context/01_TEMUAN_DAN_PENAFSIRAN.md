# Konteks masalah lama tanpa ketergantungan source lama

Bahan yang ditinjau sebelum brief ini: laporan pengujian 7 Oktober 2026 dan seluruh file teks pada snapshot source proyek lama. Ringkasan ini adalah input desain, bukan kode yang harus diimpor. Tidak perlu akun/repo lama untuk membangun.

## Fakta dari pengujian

- Awal uji semua status sehat, lalu screenshot timeout berulang termasuk pada `example.com` dengan DOM ringan dan readyState complete.
- Navigasi/read/evaluate tetap berjalan setelah beberapa kegagalan screenshot.
- Sekitar 4 menit 40 detik muncul `fetch failed`; status berikutnya melaporkan active/native/chrome false sementara device dan relay masih merespons.
- Observasi sekitar 5 menit 26 detik. Akar masalah belum dikonfirmasi; screenshot sebagai penyebab disconnect belum terbukti; Cloudflare sebagai akar masalah belum terbukti.

Laporan asli ada di `LAPORAN_ASLI_STRESS_TEST.md`. Interpretasi status disconnect di laporan bersifat awal dan perlu dikoreksi oleh temuan source berikut.

## Temuan statis dan konsekuensi untuk desain baru

| Temuan pada source lama | Implikasi yang harus diuji |
|---|---|
| Gagal fetch status native membuat catch menghasilkan active/native/chrome false dan melewati Chrome probe | Nilai false tidak membuktikan izin dicabut atau Chrome mati. Gunakan unknown dan probe independen |
| Operator memakai shared serial promise queue termasuk status; heartbeat menunggu operasi status | Operasi lambat bisa menunda heartbeat. Itu hipotesis penyumbang, belum akar masalah terbukti |
| Timer CDP membersihkan pending entry saat timeout | Jangan mengklaim permanent pending leak sudah terbukti; ukur perilaku queue/generation dan lifecycle |
| Screenshot CDP dengan timeout dan payload limits di beberapa lapisan | Isolasi capture, encode, transfer, dan delivery; tidak cukup menaikkan timeout global |
| Listener APK berhenti pada IOException tanpa supervisor khusus pemulihan listener | Butuh recovery per lapisan dan log lifecycle; tidak semua failure harus stop seluruh service |
| Port/serial ADB dikonfigurasi tetap | Perlu dynamic discovery dan trust yang dipertahankan |
| Reconnect relay ada tetapi reconnect downstream tidak terbukti menyeluruh | Health relay hijau bukan health Chrome/ADB |
| Banyak exception/log penyebab tidak terlihat | Wajib reason code, timestamp, connection generation, backlog dan lifecycle diagnostic |
| Test utama browser desktop/headless, native mock, shell fixture, serta compile APK | Belum membuktikan pairing/lifecycle/screenshot Android fisik |
| Owner intent disimpan dan tidak ditemukan timer sesi 30 menit | Jangan menyalahkan timer sesi buatan tanpa bukti |

Angka timeout/queue source lama bukan spesifikasi yang harus disalin. Pilih budget yang baru berdasarkan hasil ukur. TTL ref screenshot/elemen dan expiry auth bukan umur session background.

## Eksperimen awal yang memisahkan sebab

1. Browsing tanpa screenshot 15 menit dengan telemetry health independen.
2. Screenshot-only halaman ringan 15 menit; catat bytes, latensi tiap lapisan, pending request, heap, socket lifecycle.
3. Beban campuran, injeksi timeout screenshot, dan konfirmasi navigasi/status/heartbeat tetap pulih.
4. Catat peristiwa pertama yang gagal. Bedakan transport unavailable, permission revoked, owner stopped, stale health, dan process restarted.

Root cause baru dinyatakan setelah bukti mendukung, bukan karena pola waktu terlihat serupa.

# Urutan kerja dan gate kelayakan

## Tahap 0 — Kontrak dan lingkungan

Baca brief, buat PROJECT_STATE.md, catat alat/SDK/network/MCP/akun/device tersedia. Tetapkan paket aplikasi dan resource baru tanpa menimpa yang lama. Tentukan risiko, acceptance gate, serta dependency yang harus dibuktikan. Jangan menghabiskan waktu membuat UI besar sebelum pairing terbukti.

## Tahap 1 — Spike Android nyata (gate awal)

Buat APK minimal terinstal di Android 12. Buktikan embedded ADB pairing manual pertama, penyimpanan key, TLS connect, discovery self-device, dan akses Chrome. Ubah/restart Wireless Debugging agar port koneksi berubah lalu buktikan reconnect tanpa pairing baru selama trust valid. Sertakan log disamarkan.

Jika perangkat belum tersedia, boleh membuat spike build dan harness, tetapi gate G1 `NOT_RUN`. Pekerjaan source backend/UI dapat berlanjut terbatas dengan risiko dicatat; jangan menganggap arsitektur terbukti. Jika self-device discovery/client tidak mungkin memenuhi batas, laporkan bukti dan opsi kepada owner; jangan diam-diam menambah Termux/helper/root.

## Tahap 2 — Jalur vertikal

Hubungkan APK outbound ke relay baru, auth device, scope owner, pilih device eksplisit, jalankan status → tabs → read → navigate → screenshot melalui MCP. Implementasikan deadline, health terpisah, receipt mutasi, dan log sebelum memperluas command surface.

## Tahap 3 — Lifecycle dan UX

FGS, notifikasi, overlay, permission onboarding, Pause/Resume/Stop, restore state/update, discovery/reconnect supervisor, network switching, dan kondisi layar. Jangan menyamakan UI tertutup dengan layanan stopped. UI ringkas mengikuti keadaan nyata.

## Tahap 4 — Multi-device dan keamanan

Dua perangkat atau harness untuk tes isolasi protokol awal, lalu dua perangkat nyata untuk klaim multi-device fisik. Uji scope denial, revoke, token expiry, wrong target, replay, race reconnect, receipt UNKNOWN, dan input batas. Harness membuktikan logika saja; jangan menyebut dua ponsel terbukti bila hanya simulator.

## Tahap 5 — Regresi dan ketahanan

Lakukan skenario verification. Perbaiki satu failure mode berdasarkan diagnosis, ulangi test relevan lalu regresi yang terdampak. Jangan retry aksi ambigu. Simpan durasi/OS/Chrome/app/protocol versions, lingkungan, dan raw metadata teredaksi.

## Tahap 6 — Distribusi

Build release dengan identitas pemilik bila tersedia; cek artifact dan checksum. Buat tutorial deploy baru, instalasi bersih, pairing pertama, penggunaan harian, update, troubleshooting dan revocation. Test unzip → konfigurasi → build/deploy sejauh lingkungan memungkinkan. Kemas satu ZIP hasil dan audit tidak ada secret/key build cache.

Laporan akhir harus mengikat tiap klaim ke bukti. Bila G1/G5 fisik atau signing/deploy/client target belum lulus, tampilkan bagian yang pending di awal handoff.

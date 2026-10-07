# Provenance dan patch dependency

Archive upstream versi tetap di licenses/upstream.json; source vendored berada di source/android/third-party. Kode proyek lama tidak diimpor.

LibADB Android 3.1.1: trust manager umum upstream diganti PeerTrust. Pada channel pairing, kandidat self-signed certificate baru hanya diingat setelah peer berhasil membuktikan kode manual melalui SPAKE2 yang terikat TLS exporter. Pada channel connect, public-key pin wajib cocok. Hanya loopback ponsel sendiri diterima; NSD foreign host tidak dicoba. Tidak ada bypass TLS HTTPS/WSS. Keutuhan model pin, termasuk kesamaan identitas pairing/connect adbd, masih memerlukan G1 fisik.

Patch LibADB lainnya: TCP/handshake timeout, stream OPEN deadline dengan condition check, AtomicInteger untuk ID concurrent, stream open tidak menahan global manager lock, bounded thread join, borrowed identity tidak dihancurkan saat disconnect, resource close null-safe, dan menghapus logging peer info/TLS provider yang tidak diperlukan. Spurious wakeup/lost notify tidak dianggap stream terbuka.

SPAKE2 tag 2.2.1: varian Java murni upstream gagal 4 dari 14 test termasuk key mismatch dan mengandung debug output material key. Varian itu tidak dipakai/didistribusikan. Proyek memilih module JNI upstream dan SPAKE2-C pada gitlink 0d15933e5ba3e662cb01245a7ac0dc9fca3eac31. CSPRNG getrandom mengganti rand dengan fail-closed saat entropy gagal. Native context tetap dimiliki destroy; failure generate/process tidak membebaskan pointer dua kali. Destroy idempotent dan synchronized; stdint header ditambahkan. Patch ini tidak menjadikan library diaudit independen.

Native harness menjalankan 192 exchanges yang benar-benar memeriksa key equality/inequality untuk password/nama peer salah, tanpa mencetak key. Ini lebih ketat daripada upstream sample test.c yang hanya mencetak keys. Android APK memaketkan JNI per ABI, bukan executable yang diunduh ke writable storage. Uji Linux bukan pairing TLS Android fisik.

Toolchain: sharp 0.35.5 di-override melalui mekanisme npm karena audit versi transitive default menemukan advisory librsvg; install lockfile dan worker/harness diuji kembali. Tidak ada checksum/signature/TLS verification yang dinonaktifkan.

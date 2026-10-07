# Arsitektur dan kontrak protokol

## Jalur sistem

MCP client → endpoint HTTPS Cloudflare → router perangkat terautentikasi → koneksi outbound APK → supervisor/agent dalam APK → ADB TLS lokal dan koneksi CDP → Chrome asli Android.

Panel melihat metadata serta status terautentikasi, bukan melakukan browser automation di Cloudflare. APK tidak membuka port kontrol umum ke internet. Hindari tunnel inbound yang tidak dibutuhkan. Pilihan Worker/Durable Object dan storage disesuaikan dengan batas platform yang diverifikasi; Durable Object per perangkat/instalasi adalah kandidat, bukan alasan mengabaikan isolasi.

APK native Kotlin/Java dengan komponen native terpaket bila diperlukan. Bukan sekadar pembungkus website. Tidak ada proses Termux atau npm daemon eksternal yang harus dijalankan pemilik. Nilai tiap dependency ADB pairing/TLS untuk Android 12, lisensi, pemeliharaan, ABI, dan build reproducible. Jangan mengunduh executable ke lokasi writable lalu mengandalkan exec bila bertentangan dengan batas platform.

## Supervisor independen

Lapisan owner intent, foreground service, jaringan/relay, endpoint discovery, ADB trust/connect, CDP socket, dan Chrome target memiliki lifecycle sendiri. Kegagalan satu lapisan tidak langsung mematikan semua lapisan. Health/heartbeat dan status menggunakan jalur kontrol ringan terpisah dari antrean browser/screenshot. Reconnect menghormati owner intent dan generation ID.

Kontrak status tiap lapisan: `state` (`healthy`, `connecting`, `unavailable`, `unknown`, `paused`, `stopped`, `permission_required` sesuai domain), `checkedAt`, `lastSuccessAt`, `reasonCode`, `connectionGeneration`. Tidak semua field harus dipakai tiap lapisan; jangan menyatakan sehat dari cache basi. Readiness adalah derivasi dari bukti yang relevan dan owner intent, bukan boolean palsu karena satu fetch gagal.

## Envelope dan tindakan

Minimal message: protocolVersion, installationId, deviceId, connectionGeneration, requestId, actionId bila mutasi, payloadDigest, method, deadlineAt, payload, auth yang tidak dicatat. Respons: status, result/error terstruktur, evidence metadata, executedAt atau outcome unknown. Gunakan waktu monotonic lokal untuk durasi; waktu UTC untuk korelasi.

Tentukan schema dan validasi di kedua ujung. Scope device berasal dari auth server; jangan mempercayai deviceId dari body. Respons sesi lama ditolak. Tidak ada fallback ke device lain bila target offline.

Sebelum side effect: simpan receipt/action journal secara durable. Request duplikat dengan actionId dan payload identik mengembalikan receipt; payload berbeda ditolak. Setelah timeout atau disconnect, hasil bisa UNKNOWN dan harus diperiksa. Tidak otomatis mengulang click, type, navigation yang mengirim form, atau transaksi. Tetapkan retensi journal yang mencakup jendela retry; setelah retensi lewat jangan menerima replay lama sebagai aksi baru.

## Antrean dan deadline

- Batasi antrean, concurrency, bytes, outstanding request, dan per-device memory. Overload menghasilkan error jelas, bukan antrean tak terbatas.
- Deadline end-to-end mencakup antrean, transport, eksekusi, encoding, dan pengiriman. Jika deadline habis sebelum dispatch, jangan mengeksekusi kemudian.
- Prioritaskan control/health; screenshot tidak menjadi penghambat status. Batasi/cancel screenshot yang kedaluwarsa, dengan outcome jelas.
- Bersihkan pending CDP pada timeout, target hilang, socket close, dan restart. Korelasikan session/target/generation untuk mencegah response lama salah disalurkan.
- Setelah restart, journal dan owner intent direkonsiliasi sebelum menerima mutasi.

## MCP

Implementasikan transport MCP yang didukung client target saat build, schemas/tool descriptions nyata, auth yang sesuai, dan keluaran gambar MIME benar. Buktikan handshake/list tools/call tools di client yang dituju bila tersedia. Test HTTP buatan saja tidak membuktikan kompatibilitas ChatGPT.

Nama tool bisa disesuaikan tetapi wajib mencakup daftar/pilih perangkat, status, daftar tab, navigasi, baca halaman, interaksi, screenshot, dan receipt aksi. Pemilihan perangkat harus eksplisit dan tersimpan dalam konteks sesi yang tidak bocor antar pemilik.

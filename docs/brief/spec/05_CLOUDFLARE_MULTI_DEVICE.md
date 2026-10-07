# Cloudflare, pemasangan ulang, dan beberapa perangkat

## Setiap penerima memiliki instalasi sendiri

Distribusi memuat konfigurasi contoh tanpa rahasia. Pemilik masuk ke akun Cloudflare sendiri dan membuat endpoint MCP/panel sendiri. Tidak ada kebutuhan password akun pembuat paket atau sambungan ke server pembuat. Endpoint Worker default dapat cukup untuk awal; custom domain opsional, tidak hardcoded.

Pendaftaran pertama perangkat ke relay berbeda dengan pairing ADB lokal. Enrollment harus memiliki token singkat sekali pakai atau mekanisme sepadan, expiry, device identity, serta konfirmasi pemilik. Setelahnya kredensial perangkat unik, dapat dicabut dan dirotasi tanpa memengaruhi semua perangkat.

Satu owner boleh mendaftarkan beberapa device. DeviceId tidak bisa ditebak untuk memperoleh akses dan bukan bukti auth. Daftar/pilih device eksplisit; server memeriksa owner, scope dan device untuk setiap tool call maupun pembacaan hasil. Offline device tetap terpilih dan menghasilkan error offline; tidak dialihkan otomatis.

## Auth dan transport

Pisahkan owner/client auth dari device auth. Gunakan HTTPS/WSS dan verifikasi certificate/trust standar; jangan disable TLS verification. Implementasikan auth MCP yang kompatibel dengan client target berdasarkan dokumentasi resmi terkini. Jika OAuth diperlukan, buktikan metadata/discovery, callback, state, PKCE, audience/resource/scope, expiry/revocation, dan konfigurasi client yang sebenarnya. Password bersama bukan rancangan isolasi yang cukup.

Panel mencegah CSRF/XSS, memakai cookie/session aman bila cookie dipakai, dan tidak meletakkan token di query URL/log. Endpoint status juga autentikasi. Access token/session bisa punya expiry yang sehat; jangan menghapus expiry hanya demi klaim selalu online. Refresh/reconnect yang sah berbeda dari pemulihan izin yang dicabut.

Router memiliki per-device connection generation, queue, deadlines, journal, rate limit, screenshot budget, dan stale connection detection. Disconnect satu device tidak memutus device lain. Response terlambat setelah reconnect tidak masuk ke owner/device berbeda. Restart state Cloudflare tidak mengulang side effect ambigu.

## Deploy dan observability

Pin dependency dan lockfiles. Dokumentasikan resource/binding, migration, secrets, build, local dev, deploy, smoke test, rollback, serta cleanup. Verifikasi batas platform saat build: ukuran frame/request/response, WebSocket lifecycle, timeouts, storage, biaya/free tier. Jangan mewarisi angka dari implementasi lama tanpa pengukuran.

Skrip bersifat idempotent dan berhenti jika resource existing tidak cocok. Tidak menghapus data lama. Secret melalui secret manager/env yang sesuai, bukan source. Jangan mencetak token. Owner dapat melihat device online/offline, lapisan health, revoke device, dan diagnostic ringkas yang disamarkan.

Koneksi APK outbound mengatasi NAT tanpa membuka port ponsel. Health relay yang hijau tidak membuktikan ADB/CDP sehat. Observability mencatat metadata transport yang cukup untuk menelusuri disconnect, dengan retensi terbatas dan eksport diagnostic yang disetujui owner.

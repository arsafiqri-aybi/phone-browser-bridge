# Kebutuhan dan batas cakupan

## Pengalaman yang diharapkan

Setup pertama: install APK → baca izin dan cakupan akses → hubungkan ke instalasi Cloudflare sendiri → aktifkan izin yang relevan → buka Wireless Debugging → masukkan informasi pairing sekali melalui popup → aplikasi menemukan koneksi yang dipercaya → pilih perangkat di panel/MCP → gunakan Chrome ponsel.

Urutan detail dapat disesuaikan dengan UX yang terbukti; jangan menghapus langkah persetujuan. User bisa perlu kembali ke Settings bila debugging dimatikan atau trust dicabut. “Sekali” berarti kunci dapat dipakai lagi selama tetap valid, bukan tak ada kondisi yang memerlukan tindakan manusia.

Pemakaian berikutnya: buka aplikasi dan Resume bila sebelumnya Stop/Pause; bila tetap aktif cukup pakai MCP. Port berubah ditemukan kembali; koneksi jaringan pulih otomatis ketika OS dan trust mengizinkan. APK menyatukan kebutuhan agent yang sebelumnya bergantung pada Termux.

## Fitur wajib

| Area | Perilaku wajib |
|---|---|
| Platform | Android 12 fisik sebagai minimum; kompatibilitas versi lain dinyatakan berdasarkan test |
| Instalasi | Satu APK; semua komponen runtime terintegrasi |
| Pairing | Manual pertama, kunci tersimpan privat, revoke/forget jelas |
| Reconnect | Dynamic endpoint discovery, backoff berjitter, tidak mencoba perangkat asing |
| Background | FGS, notifikasi, owner intent tersimpan, tidak ada timer sesi buatan |
| Overlay | Popup draggable/collapsible yang dapat ditutup; izin manual |
| Browser | Chrome asli: tab, navigate, read, click/type/scroll, screenshot |
| Kontrol | Pause/Resume/Stop dan pemilihan perangkat eksplisit |
| Server | MCP HTTPS Cloudflare + panel, auth per pemilik/instalasi |
| Multi-device | Identitas, scope, queue, action journal, dan status terisolasi |
| Distribusi | Satu ZIP source + hasil build + deployment + tutorial + evidence |
| Keamanan | Consent, revocation, secret storage, anti replay, diagnostic redaction |

## Di luar tahap ini

iPhone/iOS, jaminan hidup selamanya, pelewatan force-stop, root, browser cloud pengganti, akses perangkat tanpa izin, dan jaminan lolos pemeriksaan toko aplikasi. Tidak ada fitur shell serbaguna dari MCP. Jangan membangun OAuth/dashboard besar yang tidak dibutuhkan sebelum jalur Android terbukti.

UI harus jelas untuk pengguna umum: tombol dengan akibat nyata, status tiap lapisan yang mudah dipahami, dan tindakan pemulihan yang spesifik. Jangan menampilkan istilah internal seperti “laporan AI”, chain-of-thought, atau placeholder pengembang di produk.

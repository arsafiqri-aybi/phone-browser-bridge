# Rujukan primer dan batas fakta

Dibaca untuk menyusun brief pada 7 Oktober 2026. Ringkasan ini menyediakan dasar lokal; Codex tetap memverifikasi API/dependency/kebijakan yang dapat berubah saat implementasi. Rujukan platform bukan ketergantungan pada proyek lama.

| Topik | Sumber primer | Dasar yang dipakai |
|---|---|---|
| ADB Wireless Debugging | https://developer.android.com/tools/adb | Android 11+ mendukung wireless pairing; debug/network/trust tetap prasyarat. Fitur khusus Android 17 tidak boleh dipakai sebagai bukti Android 12 |
| Pairing/TLS/mDNS ADB | https://android.googlesource.com/platform/packages/modules/adb/+/HEAD/docs/dev/adb_wifi.md | Trust key berbeda dari koneksi TCP; pairing/connect memakai service berbeda dan port koneksi dinamis; host dapat auto-connect berdasarkan trust/discovery |
| Foreground services | https://developer.android.com/develop/background-work/services/fgs | FGS untuk kerja yang terlihat pengguna, notifikasi dan pembatasan platform tetap berlaku |
| Overlay permission | https://developer.android.com/reference/android/Manifest.permission#SYSTEM_ALERT_WINDOW | Overlay menggunakan izin khusus user dan TYPE_APPLICATION_OVERLAY; bukan izin untuk melewati keamanan OS |

**Fakta vs inferensi:** sumber ADB membahas arsitektur host/device; keberhasilan embedded self-device ADB pada Android 12 belum dibuktikan hanya dari bacaan ini. Itu gate spike nyata. FGS/overlay juga tidak membuktikan hidup 24/7 atau tampil di semua security screen.

Verifikasi tambahan saat build: Android target API, NSD/network permissions per versi, service type/notification restrictions, wake locks, native code packaging, Chrome CDP Android behavior, Cloudflare runtime limits, MCP transport/auth dan integrasi client, serta kebijakan Play bila distribusi melalui toko diminta. Gunakan sumber resmi dan catat tanggal/version yang dipilih. Jangan mengandalkan jawaban forum sebagai satu-satunya pembuktian implementasi.

Tidak ada klaim sertifikasi keamanan atau lolos toko aplikasi di brief ini. “Aman” harus diterjemahkan ke kontrol teruji dan risiko yang dijelaskan, bukan label tanpa evidence.

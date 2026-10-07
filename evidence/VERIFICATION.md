# Hasil verifikasi 0.1.0

**Status produk: DEVICE_VALIDATION_PENDING + DEPLOYMENT_PENDING + SIGNING_PENDING.** Source/build dan workflow pengembangan cloud teruji. Android 12 fisik tidak tersedia; direktori USB tidak ada dan tidak ada koneksi perangkat/MCP Android yang diberikan. Cloudflare credentials/owner release key belum tersedia. Tidak ada klaim COMPLETE_VERIFIED, dua ponsel, ChatGPT kompatibel, store certification atau 24/7.

| Pemeriksaan yang dijalankan | Hasil dan batas |
|---|---|
| Integritas brief | PASS, 23 berkas cocok manifest; bukan fungsi aplikasi |
| Clean Android build | PASS, JDK17/Gradle8.9/AGP8.7.3, tiga ABI native, APK debug nyata |
| Android JVM unit tests | PASS, 5 protocol tests + 3 upstream public-key tests, 0 skipped; bukan pairing perangkat |
| Native SPAKE2 Linux | PASS, 192 exchanges termasuk wrong password/names; bukan Android PAKE/TLS |
| Worker + real local Durable Objects + SDK MCP | PASS, 12 tests termasuk init/list/call, PKCE/resource/code replay, scope, offline selection, enrollment replay, rotate, refresh/revoke, CSRF, duplicate/conflict/UNKNOWN, capture isolation dan image block |
| Local startup smoke | PASS, owner login, registry, anonymous denial; bukan live Cloudflare |
| Worker build | PASS, deploy dry-run; bukan deployment |
| npm audit | PASS, 0 vulnerabilities pada scan; bukan audit semua dependency Android atau pentest |
| Signer / SHA256 | PASS, apksigner verify, fingerprint publik dan checksum; debug, bukan release owner |
| Fresh ZIP/unzip/build | Hasil mesin tercatat dalam gates.json; bukan instalasi Android/deployment |

| Gate brief | Status | Alasan |
|---|---|---|
| G0 build | PASS | Source baru clean build dan artifact nyata; bukti log/checksum/signer |
| G1 pairing | NOT_RUN | Perlu APK pada Android 12 fisik, self-device NSD/pin, port berubah |
| G2 Chrome/MCP Android | NOT_RUN | SDK Node harness lulus; Chrome ponsel dan client target belum tersedia |
| G3 overlay | NOT_RUN | Source dan APK ada; izin/drag/close/denied case belum di perangkat |
| G4 lifecycle/update | NOT_RUN | Perlu physical restart/force-stop/update dua APK dengan owner signature |
| G5 ketahanan | NOT_RUN | Belum 60 menit physical mixed/screenshot/background; 8–24 jam juga NOT_RUN |
| G6 dua ponsel | NOT_RUN | Isolasi/replay backend fixtures lulus; dua ponsel nyata belum diuji |
| G7 keamanan | UNCERTAIN | Kontrol/scan lokal dan threat model tersedia; trust Android dan audit independen belum lengkap |
| G8 deploy | NOT_RUN | Bundle/dry-run tersedia; tidak ada akun Cloudflare usable di sesi ini |
| G9 distribusi | PASS hanya bila gates.json mencatat archive/unzip checks | ZIP/source/checksum/licenses/docs; tahap fisik/live tetap pending |

Tidak ada assertion yang dinonaktifkan untuk membuat test lulus. Pure Java SPAKE2 gagal 4/14 upstream tests dan diganti dengan native dependency; sebab/perbaikan dicatat dalam DEPENDENCY_PATCHES.md. Output keys test yang tidak diperlukan tidak dibundel. Tidak ada perubahan expected checksum atau trust verification yang dimatikan.

Fixture image `tests/fixture.jpg` adalah JPEG 1 pixel buatan untuk test format respons MCP, **bukan screenshot Android**. Test dua device memakai WebSocket harness, bukan ponsel. Source tambahan/runner physical siap membantu melanjutkan, tetapi tidak dianggap bukti fisik.

Pemeriksaan yang belum dijalankan: dynamic TLS pairing/connect Chrome Android, mobile CDP endpoints, screenshot mobile sizes/performance/memory, vendor Doze/network recovery, APK update signing owner, release build dengan owner key, target ChatGPT/Codex connector, live auth/resource limits/cost, independent Android dependency vulnerability scan/pentest, 60 menit dan 8–24 jam physical soak. Ikuti docs/UJI_PERANGKAT.md dan tambahkan evidence nyata.

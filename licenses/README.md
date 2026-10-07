# Lisensi dan dependency

Kode aplikasi dan backend baru: Apache-2.0. Source pihak ketiga tidak berasal dari repo lama. Bundle menyediakan source native, JNI, aplikasi, dan build agar pengguna dapat memodifikasi dan relink komponen LGPL serta memasang APK hasilnya dengan key sendiri. Tidak ada pembatasan reverse engineering untuk debug perubahan LGPL.

| Dependency | Versi | Lisensi / sumber |
|---|---|---|
| LibADB Android | 3.1.1 | Apache-2.0 dipilih dari lisensi ganda; source upstream MuntashirAkon/libadb-android |
| SPAKE2 Android JNI | tag 2.2.1 | LGPL-3.0; upstream MuntashirAkon/spake2-java |
| SPAKE2-C | 0d15933e5ba3e662cb01245a7ac0dc9fca3eac31 | LGPL-3.0+, bagian LGPL-2.1 / MIT / Apache-2.0 sebagaimana header source |
| Conscrypt Android | 2.5.3 | Apache-2.0; mencakup pemberitahuan BoringSSL |
| Bouncy Castle | 1.81 | MIT-style Bouncy Castle license |
| OkHttp / Okio | 4.12.0 / dependency lock Gradle | Apache-2.0 |
| AndroidX annotations | 1.9.1 | Apache-2.0 |
| Android Gradle plugin / Gradle | 8.7.3 / 8.9 | Apache-2.0, tool build |
| Wrangler | 4.148.0 | MIT / Apache-2.0, tool deployment |
| MCP SDK | 1.32.1 | MIT, client pengujian |
| ws | 8.21.0 | MIT, harness pengujian |
| sharp | override 0.35.5 | Apache-2.0; toolchain dependency, mengatasi advisory npm scan |

Provenance archive ada di `upstream.json`. Lisensi LibADB ada di `libadb/`, lisensi SPAKE2 ada di folder ini dan source vendored. Dependency AAR/JAR menyertakan META-INF notices; inventory build disimpan di evidence. SDK Android dan JDK tidak dibundel dalam ZIP; pengguna mengikuti lisensi vendor alat build.

Patch terdokumentasi: `docs/DEPENDENCY_PATCHES.md`. Pustaka ADB/SPAKE2 upstream belum diaudit keamanan independen. Build/test tidak berarti sertifikasi.

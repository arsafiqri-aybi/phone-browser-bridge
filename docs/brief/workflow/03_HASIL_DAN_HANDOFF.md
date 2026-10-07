# Satu ZIP hasil pembangunan

Nama usulan `Phone_Browser_Bridge_<version>_Deliverable.zip`. Struktur dapat sedikit disesuaikan tetapi setiap bagian wajib ada atau tercatat pending dengan sebab nyata.

| Lokasi | Isi |
|---|---|
| `START_HERE.md` | Instruksi pemilik dan status hasil/gate yang belum lulus |
| `CODEX_NEXT_SESSION.md` | Konteks lengkap, versi, pekerjaan selesai, blocker, perintah melanjutkan |
| `source/android/` | Proyek APK native lengkap + wrapper/dependency build yang valid |
| `source/cloudflare/` | Worker/MCP/panel, schema, config contoh, lockfile, migration |
| `dist/android/` | APK nyata, jenis signing, public signer fingerprint, checksum |
| `dist/cloudflare/` | Bundel deployment yang bisa dipakai akun pemilik sendiri |
| `scripts/` | Build, verify, deploy/bootstrap, smoke test, rollback/cleanup yang aman |
| `docs/` | Tutorial Indonesia, izin, pairing, update, harian, troubleshooting |
| `tests/` | Test meaningful protokol/security/recovery dan device scenario runner |
| `evidence/` | Result per gate, log redacted, versi lingkungan, batas test |
| `licenses/` | Third-party dependencies dan lisensi |
| `manifest.json` | SHA256 tiap artifact yang didistribusikan |

Jika release signing belum tersedia, dist memuat APK debug berlabel jelas dan petunjuk membuat release dengan key pemilik. Jangan menyebut debug sebagai release. Bila build belum benar-benar menghasilkan APK, jangan buat placeholder `.apk`. Build script menggantikan binary hanya dalam status pending yang jelas, bukan COMPLETE.

Tutorial tidak menuntut membuka Termux. Perintah komputer/CI untuk build/deploy boleh; runtime ponsel sepenuhnya dari APK. Jelaskan account bootstrap, tools/connector yang perlu tersedia, setup MCP ke ChatGPT/Codex menurut dokumentasi terkini, dan apa yang perlu owner lakukan manual di Android.

“Upload ZIP ke ChatGPT” hanya memberi informasi kalau isi ZIP memang dapat dibaca dalam lingkungan itu. Ia tidak otomatis memberi kredensial Cloudflare, Android remote control, atau kemampuan deployment. START_HERE harus menyatakan capability checks dan langkah konkret bila tool tidak tersedia, tanpa menjanjikan otomatisasi palsu.

Status akhir yang disarankan: COMPLETE_VERIFIED, DEVICE_VALIDATION_PENDING, BUILD_READY_DEPLOYMENT_PENDING, SIGNING_PENDING, atau BLOCKED. Lebih dari satu pending boleh berlaku. Sertakan daftar gate; label bukan pengganti bukti.

Jangan menyertakan `.git`, caches, node_modules, SDK, private keystore, token, secrets, browsing data, atau log sensitif. Sertakan source/dependency manifests yang cukup untuk rebuild. Uji integritas ZIP dan checksum. Jangan klaim byte-identical reproducible APK kecuali telah dibandingkan dua build dalam kondisi terdokumentasi.

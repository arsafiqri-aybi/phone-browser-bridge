# Phone Browser Bridge

Proyek baru dari brief 1.0: Android 12, satu APK tanpa Termux, Chrome asli, Cloudflare MCP multi-device. Baca [START_HERE.md](START_HERE.md) untuk APK dan status verifikasi. Bukti fisik dan deployment masih pending; proyek tidak berstatus COMPLETE_VERIFIED.

```sh
bash scripts/cloud-setup.sh
source /workspace/toolchains/activate.sh
node scripts/run-backend-tests.mjs
bash scripts/verify-local.sh
```

Source: `source/android` dan `source/cloudflare`. Paket hasil: jalankan `python scripts/package-deliverable.py`; artifact dibuat di `/workspace/artifacts` secara default. Panduan dan gate ada di `docs/` dan `evidence/`. Tidak ada endpoint akun pembuat atau kredensial dalam distribusi.

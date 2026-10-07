# Sumber primer dan batas

Diambil untuk build 7 Oktober 2026: README/source dependency official GitHub pada tag/commit di licenses/upstream.json; SDK repository metadata resmi dl.google.com (checksum), Gradle distribution checksum resmi, Temurin release checksum official. MCP SDK npm 1.32.1 menjalankan handshake/list/call Streamable HTTP pada runtime local Cloudflare. Registry npm dipakai untuk version pin dan audit. Build/test merupakan evidence terpisah dari dokumentasi.

- Android ADB: https://developer.android.com/tools/adb
- AOSP Wireless ADB TLS/PAKE: https://android.googlesource.com/platform/packages/modules/adb/+/HEAD/docs/dev/adb_wifi.md
- FGS: https://developer.android.com/develop/background-work/services/fgs
- Overlay: https://developer.android.com/reference/android/Manifest.permission#SYSTEM_ALERT_WINDOW
- LibADB upstream: https://github.com/MuntashirAkon/libadb-android/tree/3.1.1
- SPAKE2 upstream: https://github.com/MuntashirAkon/spake2-java/tree/2.2.1
- Native gitlink: https://github.com/MuntashirAkon/spake2-c/tree/0d15933e5ba3e662cb01245a7ac0dc9fca3eac31
- Cloudflare DO/WebSockets/limits/pricing: https://developers.cloudflare.com/durable-objects/ dan https://developers.cloudflare.com/workers/platform/limits/
- MCP transport/auth: https://modelcontextprotocol.io/specification/latest/basic/transports dan https://modelcontextprotocol.io/specification/latest/basic/authorization
- OpenAI remote MCP: https://platform.openai.com/docs/guides/tools-remote-mcp

Platform docs dinamis, live Cloudflare quota, Android vendor behavior dan UI integrasi client tidak dibuktikan hanya dengan source atau link. Verifikasi ulang pada deployment/client target; jangan memakai Android 17 untuk mengklaim Android 12. Tutorial tidak menjanjikan kebijakan Play Store/Play Protect yang belum diperiksa.

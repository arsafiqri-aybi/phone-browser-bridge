# Verification v2 — 6 October 2026

| Gate | Result | Evidence / scope |
| --- | --- | --- |
| Android resources, Java, DEX, signature | PASS | `apk-build.txt`, Android SDK35, Java17, apksigner |
| Upgrade certificate matches v1 | PASS | Certificate SHA256 `714ac5ca0caec612244d4f4ed6771f6549e2b113c14443c3cb23c2abce1d3bbc`; package unchanged, versionCode2 |
| Native HTTP parser | PASS | 10 cases; `native-http-tests.txt` |
| Real Chrome actions | PASS | `chrome-tests.txt`; desktop Chrome for Testing 154.0.8037.92; read/fill/click, duplicate ID, screenshot/tap freshness, tabs, upload boundary, pause, persisted receipts |
| MCP/OAuth workerd runtime | PASS | `cloudflare-tests.txt`; SDK1.32.1, real workerd, wrong verifier/replayed code, refresh reuse family revocation, bad Origin/auth, authenticated socket |
| Complete local relay to real Chrome | PASS | Workerd → MCP client → socket → Operator → Chrome; fixture publishing verified |
| Web panel mobile/desktop | PASS | 390px/1280px rendered screenshots; no horizontal overflow; keyboard focus, ≥48px action, pause, CSRF, no page errors. Screenshots show laboratory device, not owner's phone |
| New production Cloudflare | PASS | `phone-chrome-mcp` created, SQLite Durable Object migration v1, workers.dev enabled. Existing workers were not edited |
| Production OAuth/MCP/socket/Chrome | PASS | `cloudflare-live.json`; actual HTTPS production endpoint → authenticated lab socket → real desktop Chrome; published fixture once despite duplicate ID; actual JPEG returned; lab disconnected afterwards, test tokens revoked |
| Dependency audit | PASS | `agent-audit.json`, `cloudflare-audit.json`: 0 reported vulnerabilities at execution time; this is not a general security certification |
| Scale contract structure/status | PASS | Validator read from owner's Scale repo; validates structure only |
| Android Accessibility lifecycle on physical phone | NOT_RUN | No owner's Android device attached. `onInterrupt` no longer pauses owner session; compile does not prove OEM runtime |
| Wireless self-pair, Android background Chrome, battery rules | NOT_RUN | Requires owner installation/pairing on actual phone and Wi-Fi |
| Native APK visual render / TalkBack | NOT_RUN | Source redesigned and compiled; no Android emulator/device available |
| Connection inside owner's ordinary ChatGPT surface | NOT_RUN | User must add/install MCP plugin in supported account and finish OAuth/tool scan. SDK test is not proof that plugin is installed in every ChatGPT surface |

The delivered source and relay run. End-to-end use on the owner's HP is **pending device acceptance**, not declared complete. No Instagram account was accessed or posted during tests: publication tests used isolated local fixtures.

## Owner acceptance checklist

1. Upgrade APK, start owner control, pair Wireless Debugging, forward 9222, start agent.
2. `phone_status`: device/native/Chrome connected, active, not locked, DevTools, ready.
3. Read a harmless real page, screenshot it; place ChatGPT in foreground and repeat a Chrome page read.
4. Pause in APK or panel: further actions must fail. Resume only in APK.
5. Test intended Instagram operation under the owner's specific instruction; read back actual result. Handle OTP/CAPTCHA manually.
6. Leave agent running for the intended duration; inspect OEM battery behavior. Record actual disconnections and status; do not assume removing the timer prevents Android process termination.

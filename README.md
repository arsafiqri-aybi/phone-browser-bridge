# Phone Browser Bridge — Termux Bootstrap

Private bootstrap repository for running the uploaded Phone Browser Bridge 1.0.0 package on Android/Termux.

This repository intentionally does **not** store the Android pairing token, owner password, OAuth tokens, `.env`, or runtime `data/`.

## On the phone

1. Install the Phone Browser Bridge APK and enable its Accessibility service.
2. Regenerate/copy a fresh pairing token in the Android app.
3. Install Termux from F-Droid or the official Termux GitHub release.
4. In Termux run `termux-setup-storage` once and grant file access.
5. Put `Phone_Browser_Bridge_1.0.0.zip` in the phone Downloads folder.
6. Clone this private repository and run `bash install-termux.sh`.
7. The setup wizard asks locally for the owner password and pairing token; do not commit either secret.
8. Start with `cd ~/phone-browser-bridge-runtime/phone-browser-bridge/mcp && termux-wake-lock && npm run start:phone`.

The resulting `https://...trycloudflare.com/mcp` URL is the MCP URL to add in ChatGPT with OAuth.

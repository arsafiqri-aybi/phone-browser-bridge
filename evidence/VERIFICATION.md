# Verification — Chrome Bridge 2.1 (6 October 2026)

Observed in this release:
- APK compiled with Android SDK 35 and Java 17; resource packaging, DEX, zipalign, apksigner verify passed.
- APK 2.1 and prior 2.0 certificate SHA-256 both: 714ac5ca0caec612244d4f4ed6771f6549e2b113c14443c3cb23c2abce1d3bbc. Version code is 3. Existing installation can be updated without deleting application data.
- Agent: 5 tests passed, zero skips. Real desktop Chrome operations, journal duplicate protection, repeated relay reconnect without replay, missing-pong detection, configured-device ADB recovery and invalid/missing ADB configuration.
- Cloudflare: 2 tests passed, zero skips. Real workerd, OAuth, official MCP client, authenticated socket, actual agent/Chrome, desktop/mobile panel, CSRF rejection and owner pause.
- Termux service script exercised in an isolated shell fixture: install/update, apostrophe in paths, config preservation, persistent stop, boot honoring down file, start and boot-off passed. This is not Android runit evidence.
- Native LocalHttp parser: 10 checks passed.
- Guide rendered in actual Chrome at 390x844 and 1280x1000: no horizontal overflow and no script errors. Visual inspection completed.

Limitations: no physical owner-phone endurance test or Android emulator was available. CPU wake-lock, foreground service restart, native screens, vendor battery settings, runit on-device and Wi-Fi port changes still require owner-device verification. Chrome desktop tests do not establish Android browser uptime. SDK compilation does not prove an OEM will keep the process alive. No absolute always-on claim.

Earlier evidence files without a 2.1 suffix document prior release runs. They are retained as history, not current proof.

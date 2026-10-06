# Third-party components

Production worker uses Cloudflare platform APIs and the public MCP/OAuth standards, without bundled npm runtime dependencies. The Termux agent depends on `ws` 8.22.0 (MIT). Development checks use MCP TypeScript SDK 1.32.1 (MIT), Wrangler 4.147.0 (MIT/Apache-2.0), Miniflare 5.20261001.0-alpha (MIT), and Playwright 1.63.0 (Apache-2.0). Exact transitive dependencies/integrity values are retained in package-lock.json.

Android SDK tools, JDK, and Chrome for Testing are external build/test dependencies and are not redistributed in this repo. Gradle wrapper has its bundled license. APK is a personal build, not a Google Play release. Signing private key stays outside the repo.

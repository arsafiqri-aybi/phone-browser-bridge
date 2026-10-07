#!/usr/bin/env bash
set -euo pipefail
bridge_repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ -f "${BRIDGE_TOOLCHAIN_ROOT:-/workspace/toolchains}/activate.sh" ]]; then source "${BRIDGE_TOOLCHAIN_ROOT:-/workspace/toolchains}/activate.sh"; fi
bridge_build_type="${1:-debug}"
cd "$bridge_repo_root/source/android"
bridge_gradle_command="${BRIDGE_TOOLCHAIN_ROOT:-/workspace/toolchains}/gradle-8.9/bin/gradle"
if [[ ! -x "$bridge_gradle_command" ]]; then bridge_gradle_command=./gradlew; fi
if [[ "$bridge_build_type" == release ]]; then
  : "${BRIDGE_SIGNING_STORE:?Owner signing store required}"
  : "${BRIDGE_SIGNING_PASSWORD:?Owner signing password required}"
  : "${BRIDGE_SIGNING_ALIAS:?Owner signing alias required}"
  : "${BRIDGE_SIGNING_KEY_PASSWORD:?Owner key password required}"
  "$bridge_gradle_command" --no-daemon :app:assembleRelease :app:testDebugUnitTest :libadb:testDebugUnitTest
else
  "$bridge_gradle_command" --no-daemon :app:assembleDebug :app:testDebugUnitTest :libadb:testDebugUnitTest
fi
mkdir -p "$bridge_repo_root/dist/android"
cp "app/build/outputs/apk/$bridge_build_type/app-$bridge_build_type.apk" "$bridge_repo_root/dist/android/phone-browser-bridge-0.1.0-$bridge_build_type.apk"
"$ANDROID_HOME/build-tools/35.0.0/apksigner" verify --verbose --print-certs "$bridge_repo_root/dist/android/phone-browser-bridge-0.1.0-$bridge_build_type.apk" > "$bridge_repo_root/dist/android/$bridge_build_type-signer.txt"
cd "$bridge_repo_root/dist/android"
sha256sum "phone-browser-bridge-0.1.0-$bridge_build_type.apk" > "$bridge_build_type-sha256.txt"

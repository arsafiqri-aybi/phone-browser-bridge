#!/usr/bin/env bash
set -euo pipefail
bridge_repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
source "${BRIDGE_TOOLCHAIN_ROOT:-/workspace/toolchains}/activate.sh"
cd "$bridge_repo_root"
bridge_native_dir="$(mktemp -d /tmp/phone-bridge-native.XXXXXX)"
trap 'rm -rf -- "$bridge_native_dir"' EXIT
cc -O2 -I source/android/third-party/spake2/src/main/cpp/spake2-c/include tests/native-spake2.c source/android/third-party/spake2/src/main/cpp/spake2-c/spake2.c source/android/third-party/spake2/src/main/cpp/spake2-c/sha512.c -o "$bridge_native_dir/spake2"
"$bridge_native_dir/spake2"
bash scripts/build-android.sh
cd "$bridge_repo_root/source/cloudflare"
npm test
npm audit

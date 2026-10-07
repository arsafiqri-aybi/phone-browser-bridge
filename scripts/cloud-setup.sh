#!/usr/bin/env bash
set -euo pipefail
bridge_repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
python "$bridge_repo_root/scripts/bootstrap-toolchains.py"
source "${BRIDGE_TOOLCHAIN_ROOT:-/workspace/toolchains}/activate.sh"
cd "$bridge_repo_root/source/cloudflare"
npm ci --no-fund --no-audit
cd "$bridge_repo_root"
python scripts/init-local.py
bash scripts/build-android.sh
cd "$bridge_repo_root/source/cloudflare"
npm run build

#!/usr/bin/env python3
from pathlib import Path
import secrets
repo=Path(__file__).resolve().parent.parent
p=repo/'source/cloudflare/.dev.vars'
if not p.exists():
    p.write_text('OWNER_PASSWORD='+secrets.token_urlsafe(36)+'\nINSTALLATION_ID=local-cloud-validation\n')
    p.chmod(0o600)
print('Local credentials present; values are not printed. This file is ignored and excluded from distribution.')

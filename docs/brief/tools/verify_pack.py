#!/usr/bin/env python3
"""Periksa hash paket prompt lokal. Tidak build/deploy/mengakses akun."""
from pathlib import Path, PurePosixPath
import hashlib
import json
import sys

def main():
    root = Path(__file__).resolve().parents[1]
    try:
        manifest = json.loads((root / 'MANIFEST.json').read_text(encoding='utf-8'))
        failures = []
        listed = set()
        for item in manifest['files']:
            name = item['path']
            rel = PurePosixPath(name)
            if rel.is_absolute() or '..' in rel.parts or '\\' in name:
                failures.append(f'Unsafe path: {name}')
                continue
            listed.add(name)
            path = root / name
            if not path.is_file() or path.is_symlink():
                failures.append(f'Missing or invalid file: {name}')
                continue
            content = path.read_bytes()
            if len(content) != item['bytes'] or hashlib.sha256(content).hexdigest() != item['sha256']:
                failures.append(f'Changed file: {name}')
        actual = {p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file() and p != root / 'MANIFEST.json'}
        if actual != listed:
            failures.append(f'File set changed: {sorted(actual ^ listed)}')
        if failures:
            print('\n'.join(failures))
            return 1
        print(f'PASS: {len(listed)} files match the manifest. This verifies package integrity, not app functionality.')
        return 0
    except (OSError, ValueError, KeyError, TypeError) as exc:
        print(f'FAIL: {exc}')
        return 1

if __name__ == '__main__':
    sys.exit(main())

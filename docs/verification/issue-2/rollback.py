#!/usr/bin/env python3
"""Restore only issue #2 files. Keep later edits unless their hashes still match."""
import argparse
import hashlib
import json
import shutil
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[3])
parser.add_argument('--apply', action='store_true')
args = parser.parse_args()
evidence = Path(__file__).resolve().parent
manifest = json.loads((evidence / 'manifest.json').read_text())
root = args.root.resolve()
for row in manifest:
    target = root / row['path']
    digest = hashlib.sha256(target.read_bytes()).hexdigest() if target.exists() else None
    if digest != row['modified_sha256']:
        raise SystemExit(f"STOP: file changed since verification: {row['path']}")
    if row['baseline_sha256']:
        original = evidence / 'baseline' / (row['path'] + '.original')
        assert hashlib.sha256(original.read_bytes()).hexdigest() == row['baseline_sha256']
print(f'CHECK_PASS: {len(manifest)} files; unrelated files and runtime data are not touched')
if args.apply:
    for row in manifest:
        target = root / row['path']
        if row['baseline_sha256']:
            shutil.copyfile(evidence / 'baseline' / (row['path'] + '.original'), target)
        else:
            target.unlink()
    for row in manifest:
        target = root / row['path']
        if row['baseline_sha256']:
            assert hashlib.sha256(target.read_bytes()).hexdigest() == row['baseline_sha256']
        else:
            assert not target.exists()
    print('ROLLBACK_VERIFIED: original hashes restored, new implementation files removed')

"""Verify what's left in the file."""
from pathlib import Path

p = Path(r"d:\Web Project\amph-v2-greenfield\docs\ULTRA-REVIEW-2026-08-14.md")
text = p.read_text(encoding="utf-8")

import sys
# Find any remaining UTF-8 multi-byte sequences that look corrupt
for marker in [chr(0xE2) + chr(0x80)]:
    pos = 0
    while True:
        i = text.find(marker, pos)
        if i < 0:
            break
        # Show 20 chars before and 10 after
        start = max(0, i - 10)
        end = min(len(text), i + 20)
        sys.stdout.buffer.write(f"@{i}: {text[start:end]!r}\n".encode("utf-8", errors="replace"))
        pos = i + 1

# Also try raw bytes
raw_bytes = p.read_bytes()
patterns = [
    (b"\xc3\xa2\xc2\x80\xc2\x94", "em-dash pattern"),
    (b"\xc3\xa2\xe2\x82\xac", "any â"),
]
for pat, desc in patterns:
    i = raw_bytes.find(pat)
    if i >= 0:
        sys.stdout.buffer.write(f"raw bytes @{i}: {desc} found\n".encode())
    else:
        sys.stdout.buffer.write(f"raw bytes: {desc} not found\n".encode())

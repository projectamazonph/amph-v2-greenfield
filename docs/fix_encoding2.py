"""Fix left-arrow corruption in the supplementary section.
The previous pass missed â† pattern. Use byte-level match."""
import sys
from pathlib import Path

p = Path(r"d:\Web Project\amph-v2-greenfield\docs\ULTRA-REVIEW-2026-08-14.md")
text = p.read_text(encoding="utf-8")

# Find every 3-byte UTF-8 sequence that looks like a mojibake 'â'
# and check the surrounding 2 bytes after to find left-arrow.
fixes = {
    "â†": "\u2190",  # Generic left-arrow corruption variant
    "â€": None,  # We already fixed em/en-dash variants
}

count = 0
for bad, good in fixes.items():
    if good is None:
        continue
    before = len(text)
    text = text.replace(bad, good)
    after = len(text)
    delta = (before - after) // max(1, len(bad) - len(good))
    count += delta
    sys.stdout.buffer.write(f"  {bad!r} -> {good!r}: {delta}\n".encode("utf-8", errors="replace"))

p.write_text(text, encoding="utf-8")
sys.stdout.buffer.write(f"Total fixed: {count}\n".encode("utf-8"))

"""Fix UTF-8 corruption in the supplementary section of ULTRA-REVIEW-2026-08-14.md.
PowerShell's Add-Content doubled-encoding some characters. Decode those back."""
import sys
from pathlib import Path

p = Path(r"d:\Web Project\amph-v2-greenfield\docs\ULTRA-REVIEW-2026-08-14.md")
text = p.read_text(encoding="utf-8")

replacements = {
    "\u00e2\u20ac\u201d": "\u2014",  # em-dash
    "\u00e2\u20ac\u201c": "\u2013",  # en-dash
    "\u00e2\u20ac\u0153": "\u2014",  # em-dash variant
    "\u00e2\u20ac\u009d": "\u201d",  # right double quote (rare)
    "\u00e2\u2020\u2019": "\u2192",  # right arrow
    "\u00e2\u2020\u02dc": "\u2190",  # left arrow
    "\u00e2\u2020\u2018": "\u2190",  # left arrow variant
    "\u00e2\u20ac\u2122": "\u2019",  # right single quote
}

count = 0
for bad, good in replacements.items():
    before = len(text)
    text = text.replace(bad, good)
    after = len(text)
    delta = (before - after) // max(1, len(bad) - len(good))
    count += delta
    sys.stdout.buffer.write(f"  {bad!r} -> {good!r}: {delta}\n".encode("utf-8", errors="replace"))

p.write_text(text, encoding="utf-8")
sys.stdout.buffer.write(f"Total fixed: {count}\nFinal size: {p.stat().st_size} bytes\n".encode("utf-8"))

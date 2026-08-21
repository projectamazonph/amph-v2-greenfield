#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "superpowers" / "deep-lesson-pedagogy-digest.md"
FILES = [
    "content/curriculum/modules/1-foundations/1.1-read-ppc-data-before-you-change-it.mdx",
    "content/curriculum/modules/1-foundations/1.2-cpc-ctr.mdx",
    "content/curriculum/modules/2-keyword-research/2.1-match-types.mdx",
    "content/curriculum/modules/2-keyword-research/2.3-negative-keywords.mdx",
    "content/curriculum/modules/4-campaign-architecture/4.4-campaign-architecture-practice.mdx",
    "content/curriculum/modules/6-bidding-lab/6.1-bid-strategies.mdx",
    "content/curriculum/modules/7-search-term-triage/7.1-search-term-analysis.mdx",
    "content/curriculum/modules/8-competitive-intelligence/8.3-competitor-benchmarking.mdx",
]

lines = ["# Deep Lesson Pedagogy Source Digest", ""]
for relative in FILES:
    path = ROOT / relative
    source = path.read_text(encoding="utf-8")
    lines.append(f"## {relative}")
    lines.append("")
    headings = [line.strip() for line in source.splitlines() if re.match(r"^#{1,3} ", line)]
    lines.append("### Headings and sequence")
    lines.extend(f"- {heading}" for heading in headings)
    lines.append("")
    lines.append("### Visual directives in source order")
    source_lines = source.splitlines()
    for index, line in enumerate(source_lines):
        match = re.match(r"^:::([a-z-]+)(?:\{([^}]*)\})?", line)
        if match:
            name = match.group(1)
            attrs = match.group(2) or ""
            lines.append(f"- Line {index + 1}: `::{name}` {attrs}")
    lines.append("")
    lines.append("### Practice and feedback anchors")
    anchors = []
    for index, line in enumerate(source_lines):
        if re.match(r"^##\s+(Your turn|Try this|Check|Quick check|Key takeaway|Key Takeaways|Client language|Add to your worksheet|Complete your worksheet|Independent calculation|What Would YOU Do)", line, re.I):
            anchors.append(f"- Line {index + 1}: {line.strip()}")
    lines.extend(anchors or ["- No recognized anchor found."])
    lines.append("")
OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
print(OUT)

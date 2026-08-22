#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

REVEAL_TARGETS = {
    "content/curriculum/modules/1-foundations/1.1-read-ppc-data-before-you-change-it.mdx": ["read-before-change-flow"],
    "content/curriculum/modules/1-foundations/1.2-cpc-ctr.mdx": ["cpc-ctr-diagnosis"],
    "content/curriculum/modules/2-keyword-research/2.1-match-types.mdx": ["match-type-routing"],
    "content/curriculum/modules/2-keyword-research/2.3-negative-keywords.mdx": ["negative-routing-board", "negative-scope-routing"],
    "content/curriculum/modules/4-campaign-architecture/4.4-campaign-architecture-practice.mdx": ["campaign-builder-sequence"],
    "content/curriculum/modules/6-bidding-lab/6.1-bid-strategies.mdx": ["bid-strategy-routing"],
    "content/curriculum/modules/7-search-term-triage/7.1-search-term-analysis.mdx": ["search-term-action-board", "search-term-triage-flow"],
    "content/curriculum/modules/8-competitive-intelligence/8.3-competitor-benchmarking.mdx": ["competitor-gap-matrix", "competitive-insight-router"],
}
REMOVE_IDS = {
    "diagnostic-map",
    "decision-sequence",
    "pattern-board",
}
OPEN = re.compile(r"^:::([a-z-]+)\{([^}]*)\}\s*$")


def remove_block(source: str, block_id: str) -> str:
    lines = source.splitlines(keepends=True)
    out = []
    index = 0
    while index < len(lines):
        match = OPEN.match(lines[index].rstrip("\n"))
        if match and dict(re.findall(r'([a-zA-Z][\w-]*)="([^"]*)"', match.group(2))).get("id") == block_id:
            index += 1
            while index < len(lines) and not re.match(r"^:::\s*$", lines[index].rstrip("\n")):
                index += 1
            if index < len(lines):
                index += 1
            if out and out[-1].strip() == "":
                out.pop()
            continue
        out.append(lines[index])
        index += 1
    return "".join(out)


def add_reveal(source: str, block_id: str) -> str:
    lines = source.splitlines(keepends=True)
    for index, line in enumerate(lines):
        match = OPEN.match(line.rstrip("\n"))
        if not match:
            continue
        attrs = match.group(2)
        parsed = dict(re.findall(r'([a-zA-Z][\w-]*)="([^"]*)"', attrs))
        if parsed.get("id") != block_id or "reveal-mode" in parsed:
            continue
        suffix = " reveal-mode=\"after-choice\""
        newline = "\n" if line.endswith("\n") else ""
        lines[index] = f":::{match.group(1)}{{{attrs}{suffix}}}{newline}"
    return "".join(lines)


def main() -> None:
    changed = []
    for relative, ids in REVEAL_TARGETS.items():
        path = ROOT / relative
        source = path.read_text(encoding="utf-8")
        updated = source
        for block_id in ids:
            updated = add_reveal(updated, block_id)
        if relative.endswith("1.1-read-ppc-data-before-you-change-it.mdx"):
            for block_id in REMOVE_IDS:
                updated = remove_block(updated, block_id)
        if updated != source:
            path.write_text(updated, encoding="utf-8")
            changed.append(relative)
    print(f"changed={len(changed)}")
    for relative in changed:
        print(relative)


if __name__ == "__main__":
    main()

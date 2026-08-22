#!/usr/bin/env python3
"""Audit enriched-visual coverage across the Amazon PH curriculum."""
from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LESSONS = ROOT / "content" / "curriculum" / "modules"
OUT = ROOT / "docs" / "superpowers" / "enriched-visual-coverage-audit.json"

FENCE = re.compile(r"^:::([a-z-]+)(?:\{([^}]*)\})?\s*$", re.MULTILINE)
ATTR = re.compile(r'([a-zA-Z][\w-]*)\s*=\s*"([^"]*)"')
DEDICATED = {
    "comparison-table", "formula-ladder", "classification-board", "decision-flow", "simulation-rubric",
    "annotated-listing", "hierarchy-builder", "funnel-canvas", "timeline-calendar",
    "competitive-gap-matrix", "insight-router", "lesson-pathway", "simulation-brief",
    "portfolio-map", "seasonal-calendar", "evidence-ledger", "sov-positioner",
}
INTERACTIVE = {
    "classification-board", "decision-flow", "annotated-listing", "hierarchy-builder", "funnel-canvas",
    "timeline-calendar", "competitive-gap-matrix", "insight-router", "lesson-pathway", "simulation-brief",
    "portfolio-map", "seasonal-calendar", "evidence-ledger", "sov-positioner",
}
REQUIRED_SECTIONS = {
    "outcome": re.compile(r"^##\s+What you can do after this lesson\s*$", re.I | re.M),
    "decision": re.compile(r"^##\s+The decision in one sentence\s*$", re.I | re.M),
    "workedExample": re.compile(r"example|case study|scenario|walkthrough|calculate|calculation|work it through", re.I),
    "activeAttempt": re.compile(r"^##\s+(Your turn|Try this|Try This|What Would YOU Do|Practice)\b", re.I | re.M),
    "feedback": re.compile(r"^##\s+(Check|Quick check|Answers?|Feedback)\s*$", re.I | re.M),
    "evidence": re.compile(r"worksheet|client language|artifact|deliverable|record|evidence", re.I),
    "retrieval": re.compile(r"^##\s+(Key takeaway|Key takeaways|What to read next|Quick check|Check)\s*$", re.I | re.M),
}


def frontmatter(source: str) -> dict[str, str]:
    if not source.startswith("---"):
        return {}
    end = source.find("\n---", 3)
    if end < 0:
        return {}
    result: dict[str, str] = {}
    for line in source[3:end].splitlines():
        if ":" in line:
            key, value = line.split(":", 1)
            result[key.strip()] = value.strip().strip('"')
    return result


def directives(source: str) -> list[dict[str, object]]:
    lines = source.splitlines()
    blocks: list[dict[str, object]] = []
    index = 0
    while index < len(lines):
        match = re.match(r"^:::([a-z-]+)(?:\{([^}]*)\})?\s*$", lines[index])
        if not match:
            index += 1
            continue
        name = match.group(1)
        attrs = dict(ATTR.findall(match.group(2) or ""))
        body: list[str] = []
        close = None
        for cursor in range(index + 1, len(lines)):
            if re.match(r"^:::\s*$", lines[cursor]):
                close = cursor
                break
            body.append(lines[cursor])
        payload = "\n".join(body).strip()
        valid_json = None
        if name in DEDICATED or name in {"visual", "slide"}:
            try:
                json.loads(payload)
                valid_json = True
            except json.JSONDecodeError:
                valid_json = False
        blocks.append({"name": name, "attrs": attrs, "line": index + 1, "validJson": valid_json, "closed": close is not None})
        index = (close + 1) if close is not None else index + 1
    return blocks


def score(source: str, blocks: list[dict[str, object]]) -> dict[str, object]:
    names = [str(block["name"]) for block in blocks]
    visual_names = [name for name in names if name in DEDICATED or name in {"visual", "slide"}]
    dedicated = [name for name in visual_names if name in DEDICATED]
    types = sorted(set(visual_names))
    interactive = sorted(set(dedicated) & INTERACTIVE)
    sections = {key: bool(pattern.search(source)) for key, pattern in REQUIRED_SECTIONS.items()}
    valid_visuals = all(block["validJson"] is not False for block in blocks if block["name"] in DEDICATED or block["name"] in {"visual", "slide"})
    visual_points = min(6, (1 if visual_names else 0) + (1 if dedicated else 0) + (1 if len(visual_names) >= 2 else 0) + (1 if len(types) >= 2 else 0) + (1 if interactive else 0) + (1 if len(visual_names) >= 3 else 0))
    if not visual_names:
        depth = "none"
    elif not dedicated:
        depth = "legacy"
    elif visual_points >= 5:
        depth = "deep"
    elif visual_points >= 3:
        depth = "enriched"
    else:
        depth = "single"
    missing_sections = [key for key, present in sections.items() if not present]
    return {
        "visualBlockCount": len(visual_names),
        "dedicatedBlockCount": len(dedicated),
        "visualTypes": types,
        "interactiveTypes": interactive,
        "validVisualJson": valid_visuals,
        "visualDepth": depth,
        "visualScore": visual_points,
        "contractSections": sections,
        "missingContractSections": missing_sections,
    }


def main() -> None:
    lessons = []
    for path in sorted(LESSONS.rglob("*.mdx")):
        source = path.read_text(encoding="utf-8")
        blocks = directives(source)
        meta = frontmatter(source)
        lesson_score = score(source, blocks)
        lessons.append({
            "path": str(path.relative_to(ROOT)),
            "moduleNumber": meta.get("moduleNumber"),
            "lessonNumber": meta.get("lessonNumber"),
            "title": meta.get("title"),
            "slug": meta.get("slug"),
            "directives": blocks,
            **lesson_score,
        })
    modules: dict[str, dict[str, object]] = defaultdict(lambda: {"lessons": 0, "depth": Counter(), "blocks": 0, "deepOrEnriched": 0})
    for lesson in lessons:
        module = str(lesson["moduleNumber"])
        modules[module]["lessons"] += 1
        modules[module]["depth"][lesson["visualDepth"]] += 1
        modules[module]["blocks"] += lesson["visualBlockCount"]
        if lesson["visualDepth"] in {"enriched", "deep"}:
            modules[module]["deepOrEnriched"] += 1
    module_summary = {}
    for module, values in modules.items():
        module_summary[module] = {**values, "depth": dict(values["depth"])}
    summary = {
        "lessonCount": len(lessons),
        "visualLessons": sum(1 for lesson in lessons if lesson["visualBlockCount"]),
        "dedicatedVisualLessons": sum(1 for lesson in lessons if lesson["dedicatedBlockCount"]),
        "enrichedOrDeepLessons": sum(1 for lesson in lessons if lesson["visualDepth"] in {"enriched", "deep"}),
        "deepLessons": sum(1 for lesson in lessons if lesson["visualDepth"] == "deep"),
        "legacyVisualLessons": sum(1 for lesson in lessons if lesson["visualDepth"] == "legacy"),
        "noVisualLessons": sum(1 for lesson in lessons if lesson["visualDepth"] == "none"),
        "invalidVisualPayloadLessons": sum(1 for lesson in lessons if not lesson["validVisualJson"]),
    }
    payload = {"summary": summary, "modules": module_summary, "lessons": lessons}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(summary, indent=2))
    for lesson in lessons:
        print(f"{lesson['moduleNumber']}.{lesson['lessonNumber']}\t{lesson['visualDepth']}\t{lesson['visualScore']}/6\t{lesson['visualBlockCount']} blocks\t{lesson['title']}")


if __name__ == "__main__":
    main()

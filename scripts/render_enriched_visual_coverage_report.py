#!/usr/bin/env python3
"""Render the structured enriched-visual audit as a Markdown report."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "docs" / "superpowers" / "enriched-visual-coverage-audit.json"
OUT = ROOT / "docs" / "superpowers" / "enriched-visual-coverage-audit.md"


def recommendation(depth: str) -> str:
    return {
        "deep": "Ready: maintain and reuse the pattern.",
        "enriched": "Deepen: add a second visual or connect the current block to a decision sequence.",
        "single": "Thin: add at least one additional visual and an interactive or evidence-first treatment.",
        "legacy": "Migrate: replace generic visual payloads with dedicated semantic primitives.",
        "none": "Gap: build a lesson-specific visual sequence before calling the lesson enriched.",
    }[depth]


def main() -> None:
    payload = json.loads(DATA.read_text(encoding="utf-8"))
    summary = payload["summary"]
    lessons = payload["lessons"]
    modules = payload["modules"]
    gaps = [lesson for lesson in lessons if lesson["visualDepth"] in {"none", "legacy", "single"}]
    ready = [lesson for lesson in lessons if lesson["visualDepth"] == "deep"]
    enriched = [lesson for lesson in lessons if lesson["visualDepth"] == "enriched"]

    lines = [
        "# Enriched Visual Coverage Audit",
        "",
        "> This audit distinguishes the presence of a visual block from substantive lesson enrichment. A lesson is classified as **deep** only when it has multiple visual blocks, multiple visual types, and at least one interactive or decision-oriented primitive.",
        "",
        "## Executive result",
        "",
        f"The curriculum contains **{summary['lessonCount']} lessons**. **{summary['visualLessons']}** contain at least one visual block, **{summary['dedicatedVisualLessons']}** use a dedicated semantic visual primitive, **{summary['enrichedOrDeepLessons']}** meet the enriched-or-deep threshold, and only **{summary['deepLessons']}** meet the deep threshold. Therefore, the answer to whether all 31 lessons currently have enriched visuals is **no**.",
        "",
        "| Coverage signal | Count | Share |",
    ]
    total = summary["lessonCount"]
    for label, key in [
        ("Any visual block", "visualLessons"),
        ("Dedicated visual primitive", "dedicatedVisualLessons"),
        ("Enriched or deep", "enrichedOrDeepLessons"),
        ("Deep", "deepLessons"),
        ("Legacy visual-only", "legacyVisualLessons"),
        ("No visual block", "noVisualLessons"),
    ]:
        count = summary[key]
        lines.append(f"| {label} | {count} | {count / total:.0%} |")
    lines += [
        "",
        "## Module coverage",
        "",
        "| Module | Lessons | Deep | Enriched | Thin / legacy / none | Visual blocks |",
        "| --- | ---: | ---: | ---: | ---: | ---: |",
    ]
    for module in sorted(modules, key=lambda value: int(value)):
        item = modules[module]
        depth = item["depth"]
        thin = item["lessons"] - depth.get("deep", 0) - depth.get("enriched", 0)
        lines.append(f"| {module} | {item['lessons']} | {depth.get('deep', 0)} | {depth.get('enriched', 0)} | {thin} | {item['blocks']} |")

    lines += ["", "## Lesson-level audit", "", "| Lesson | Title | Status | Score | Blocks | Types | Contract gaps | Recommended action |", "| --- | --- | --- | ---: | ---: | --- | --- | --- |"]
    for lesson in lessons:
        lesson_id = f"{lesson['moduleNumber']}.{lesson['lessonNumber']}"
        types = ", ".join(lesson["visualTypes"]) if lesson["visualTypes"] else "None"
        contract_gaps = ", ".join(lesson["missingContractSections"]) if lesson["missingContractSections"] else "None"
        lines.append(f"| {lesson_id} | {lesson['title']} | **{lesson['visualDepth']}** | {lesson['visualScore']}/6 | {lesson['visualBlockCount']} | {types} | {contract_gaps} | {recommendation(lesson['visualDepth'])} |")

    lines += ["", "## Immediate remediation queue", "", "The following lessons should be enriched before the curriculum is described as fully visual:", ""]
    for lesson in gaps:
        lesson_id = f"{lesson['moduleNumber']}.{lesson['lessonNumber']}"
        lines.append(f"1. **{lesson_id} — {lesson['title']}**: {recommendation(lesson['visualDepth'])}")

    lines += ["", "## Current strengths", ""]
    for lesson in ready:
        lesson_id = f"{lesson['moduleNumber']}.{lesson['lessonNumber']}"
        lines.append(f"- **{lesson_id} — {lesson['title']}** uses {lesson['visualBlockCount']} blocks across {len(lesson['visualTypes'])} visual types and has an interactive or decision-oriented treatment.")
    lines += ["", "## Audit limitations", "", "This is a source-level audit. It verifies directive presence, JSON validity, visual-type diversity, and learning-contract headings. It does not replace browser-based visual inspection of every lesson at desktop and mobile widths, nor does it prove that every visual payload is pedagogically optimal. The 1.1 lesson is classified as legacy because it uses generic visual payloads rather than the dedicated semantic primitives, even though its visual count is high.", ""]
    OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(OUT)


if __name__ == "__main__":
    main()

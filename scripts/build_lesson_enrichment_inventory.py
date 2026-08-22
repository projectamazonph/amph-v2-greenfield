from pathlib import Path
import json
import re

ROOT = Path("content/curriculum/modules")

def frontmatter(text: str):
    match = re.match(r"^---\n(.*?)\n---\n", text, flags=re.S)
    values = {}
    if not match:
        return values
    for line in match.group(1).splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        values[key.strip()] = value.strip().strip('"')
    return values

records = []
for path in sorted(ROOT.rglob("*.mdx")):
    text = path.read_text()
    fm = frontmatter(text)
    headings = re.findall(r"^(#{1,3})\s+(.+)$", text, flags=re.M)
    directives = re.findall(r"^:::([a-z-]+)", text, flags=re.M)
    records.append({
        "file": str(path),
        "slug": fm.get("slug", path.stem),
        "title": fm.get("title", path.stem),
        "moduleNumber": int(fm["moduleNumber"]) if fm.get("moduleNumber", "").isdigit() else None,
        "lessonNumber": int(fm["lessonNumber"]) if fm.get("lessonNumber", "").isdigit() else None,
        "type": fm.get("type"),
        "estimatedMinutes": int(fm["estimatedMinutes"]) if fm.get("estimatedMinutes", "").isdigit() else None,
        "headings": [title for _, title in headings],
        "directives": directives,
        "hasSelfCheck": "<SelfCheck" in text,
        "hasWorkedExample": bool(re.search(r"example|case|scenario|calculate|work it through", text, flags=re.I)),
        "hasPractice": bool(re.search(r"^##\s+(Your turn|Practice|Independent calculation|Try this|Check)", text, flags=re.M)),
        "hasWorksheet": bool(re.search(r"worksheet|sheet|template|artifact|deliverable", text, flags=re.I)),
        "wordCount": len(re.findall(r"\b[\w'-]+\b", text)),
    })

Path("docs/superpowers/lesson-enrichment-inventory.json").write_text(json.dumps(records, indent=2) + "\n")
print(f"Inventoried {len(records)} lessons")

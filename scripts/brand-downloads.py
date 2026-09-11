#!/usr/bin/env python3
"""Brand the download-center binaries (P1-03).

Adds Project Amazon PH Academy identity to every XLSX and DOCX under
public/downloads, matching the footer convention the PDFs already
carry. Content cells and formulas are never touched:

- XLSX: document properties (creator, title) + a print footer on
  every sheet + one brand row appended below the last used row of
  the help sheet ("How to use" when present, else the first sheet).
  Appending never shifts existing cells, so live formulas keep
  their references.
- DOCX: a section header plus the shared footer disclaimer.
  Body paragraphs are untouched.

Usage: python3 scripts/brand-downloads.py [--check]
--check exits non-zero when any file lacks branding (CI gate).
"""

from __future__ import annotations

import glob
import sys

BRAND_SHORT = "Project Amazon PH Academy \u2014 Download Center"
BRAND_FOOTER = (
    "Project Amazon PH Academy \u2014 Download Center. "
    "Educational reference material; verify against current Amazon Ads "
    "policy and your account's own data before acting."
)


def brand_workbook(path: str) -> list[str]:
    import openpyxl

    changes: list[str] = []
    wb = openpyxl.load_workbook(path)
    if wb.properties.creator != "Project Amazon PH Academy":
        wb.properties.creator = "Project Amazon PH Academy"
        wb.properties.lastModifiedBy = "Project Amazon PH Academy"
        changes.append("properties")
    help_sheet = None
    for ws in wb.worksheets:
        if ws.title.lower().replace("_", " ") == "how to use":
            help_sheet = ws
            break
    if help_sheet is None:
        help_sheet = wb.worksheets[0]
    for ws in wb.worksheets:
        center = ws.oddFooter.center
        if center.text != BRAND_SHORT:
            center.text = BRAND_SHORT
            center.size = 9
            changes.append(f"footer:{ws.title}")
    branded = any(
        (row[0].value or "") == BRAND_SHORT
        for row in help_sheet.iter_rows(min_row=1, max_row=help_sheet.max_row)
    )
    if not branded:
        row_idx = help_sheet.max_row + 2
        help_sheet.cell(row=row_idx, column=1, value=BRAND_SHORT)
        changes.append(f"brand-row:{help_sheet.title}!A{row_idx}")
    if changes:
        wb.save(path)
    return changes


def workbook_branded(path: str) -> bool:
    import openpyxl

    wb = openpyxl.load_workbook(path, data_only=True)
    if wb.properties.creator != "Project Amazon PH Academy":
        return False
    return all(ws.oddFooter.center.text == BRAND_SHORT for ws in wb.worksheets)


def brand_document(path: str) -> list[str]:
    import docx

    changes: list[str] = []
    doc = docx.Document(path)
    for section in doc.sections:
        header = section.header.paragraphs[0] if section.header.paragraphs else None
        if header is None or header.text != BRAND_SHORT:
            if header is None:
                header = section.header.add_paragraph()
            header.text = BRAND_SHORT
            changes.append("header")
        footer = section.footer.paragraphs[0] if section.footer.paragraphs else None
        if footer is None or footer.text != BRAND_FOOTER:
            if footer is None:
                footer = section.footer.add_paragraph()
            footer.text = BRAND_FOOTER
            changes.append("footer")
    if changes:
        doc.save(path)
    return changes


def document_branded(path: str) -> bool:
    import docx

    doc = docx.Document(path)
    return all(
        section.header.paragraphs
        and section.header.paragraphs[0].text == BRAND_SHORT
        and section.footer.paragraphs
        and section.footer.paragraphs[0].text == BRAND_FOOTER
        for section in doc.sections
    )


def main() -> int:
    check_only = "--check" in sys.argv[1:]
    failures: list[str] = []
    for path in sorted(glob.glob("public/downloads/**/*.xlsx", recursive=True)):
        if check_only:
            if not workbook_branded(path):
                failures.append(path)
        else:
            for change in brand_workbook(path):
                print(f"{path}: {change}")
    for path in sorted(glob.glob("public/downloads/**/*.docx", recursive=True)):
        if check_only:
            if not document_branded(path):
                failures.append(path)
        else:
            for change in brand_document(path):
                print(f"{path}: {change}")
    if failures:
        print("UNBRANDED:")
        for path in failures:
            print(f"  {path}")
        return 1
    print("All workbooks and documents carry branding.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

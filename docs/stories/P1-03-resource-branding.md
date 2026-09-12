# P1-03 — Download branding on all resources (PR-C slice 4)

**Status:** Implemented — merged on `main`. `scripts/brand-downloads.py` (rerunnable, `--check` gate) brands all 11 XLSX workbooks and 2 DOCX handouts to match the PDF footer convention. 293/293 formula cells byte-identical. DOCX body paragraph counts unchanged. See `CHANGELOG.md` for confirmation.

## The gap (verified against source, 2026-09-11)

Content audit of all 26 binaries under `public/downloads`:

- 13/13 PDFs carry Project Amazon PH Academy branding (footer
  disclaimer on the last page).
- 0/11 XLSX workbooks carry any brand string (full cell scan).
- 0/2 DOCX handouts carry any brand string (103 + 25 body
  paragraphs scanned).

## What changed

`scripts/brand-downloads.py` (checked in, rerunnable, `--check`
gate) brands every workbook and document to match the PDF footer
convention. Content cells and formulas are never touched:

- XLSX: document properties (creator), a print footer with the
  brand line on every sheet, and one brand row appended below the
  last used row of the help sheet. Appending never shifts cells.
- DOCX: section header plus the shared PDF footer disclaimer.
  Body paragraphs untouched.

## Verification

- `python3 scripts/brand-downloads.py --check` passes (idempotent
  rerun brands nothing new).
- 293/293 live formula cells byte-identical before and after
  (snapshot compared across all 11 workbooks).
- DOCX body paragraph counts unchanged (103, 25); headers and
  footers present on every section.
- `pnpm tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build`
  unaffected (binary-only change plus one script).

## Out of scope

- PDF regeneration (already branded).
- Seed metadata titles/descriptions (unchanged).
- P1-06 email templates (verified separately), PR-D OAuth.

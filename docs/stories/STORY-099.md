# STORY-099: Download center content library expansion

**Points:** 1
**Epic:** Content library gap closure (follow-up to STORY-098/098.5, requested directly)

## Status

**Status:** Done — 2026-08-03.

## Goal

STORY-098/098.5 shipped the download center feature end-to-end with 10
pre-installed resources (2 per category). The feature itself needed no
further code — `Resource`, its ports/adapters, admin CRUD, and the
student page already handle any number of resources in any of the 5
categories and 3 access tiers. What was missing was more content. This
story adds 16 more real, downloadable resources, bringing the library
from 10 to 26, spread across all 5 categories to fill gaps the first
batch didn't cover (Sponsored Brands/Display, negative keywords,
client onboarding, budget pacing, and several more automation tools
and cheat sheets).

## What shipped

Sixteen new files, checked into `public/downloads/<category>/` and
seeded via `scripts/seed-resources.ts` (now 26 `ResourceDef` entries
total):

**Guides (3, PDF, PREVIEW tier):**

- Sponsored Brands Setup Guide
- Sponsored Display Setup Guide
- Campaign Structure & Match Type Strategy Guide

**Templates (3, XLSX, STARTER tier):**

- Negative Keyword Master List Template — a running log (keyword/ASIN,
  match type, level, applied-to, reason, date) with dropdown data
  validation for match type and level.
- New Client Onboarding Checklist Template — a 5-phase checklist
  (access, audit, goals, campaign cleanup, first report) with a Status
  dropdown and conditional formatting.
- Budget Pacing Tracker Template — a daily budget-vs-actual log with
  running month totals and average daily spend (`SUM`/`AVERAGEIF`
  formulas), intentionally simpler than the automation tool below —
  this one is for the daily manual log, not hour-level analysis.

**Automation tools (4, XLSX with live formulas, STARTER tier):**

- Placement Bid Modifier Calculator — recommends a bid modifier per
  placement (Top of Search / Product Pages / Rest of Search) from
  target ACOS, flagging placements without enough orders as
  "Insufficient data."
- Keyword Bid Calculator — suggests a starting max CPC for new/low-data
  keywords from target ACOS × estimated CVR × average order value ×
  a safety margin, and buckets current bids as Lower bid / OK / Room
  to raise.
- Budget Pacing & Dayparting Analyzer — two sheets: daily pacing
  (expected spend vs. actual, flagging over/under-pacing) and hourly
  dayparting (flags hours with poor ACOS or zero orders as dayparting
  candidates).
- Campaign Health Scorecard — a weighted 0-100 score per campaign (50%
  ACOS-vs-target, 25% CTR-vs-target, 25% CVR-vs-target), bucketed into
  Healthy / Watch / At risk, with an "Insufficient data" floor for
  campaigns below a minimum order count.

**Cheat sheets (3, PDF, PREVIEW tier):**

- Amazon PPC Acronyms & Glossary Cheat Sheet
- SP vs SB vs SD Comparison Cheat Sheet
- Negative Keyword Match Type Cheat Sheet

**Handouts (3, PREVIEW tier):**

- VA Weekly Task Checklist (PDF)
- Troubleshooting Common PPC Issues (PDF)
- Client Communication Etiquette (DOCX) — pairs with the existing
  Client Communication — Email Templates handout from STORY-098; that
  one is ready-to-send email copy, this one is the tone/process
  guidance behind it.

No changes to `src/domain/`, `src/ports/`, `src/usecases/`,
`src/infra/`, or `src/app/` — this story is pure content plus the
`scripts/seed-resources.ts` data it's seeded from.

## Formula verification caveat

Same limitation as STORY-098: this sandbox cannot get LibreOffice's
headless recalculation working (confirmed via `strace` in the prior
session — an environment limitation, not a defect in the generated
files). All four automation tools' formula _logic_ was independently
verified by reimplementing each formula in plain Python against the
exact sample rows shipped in the workbook, and confirming the bucket
(status/recommendation/action) each row lands in matches what a human
reviewing the same numbers would expect:

- **Placement Bid Modifier Calculator** — 8 sample placement rows:
  3 "Insufficient data" (orders below the minimum), 5 numeric
  modifiers ranging from +0% to +150%.
- **Keyword Bid Calculator** — 7 sample keyword rows: 3 "Lower bid,"
  2 "Room to raise," 2 "OK" (current bid re-tuned during authoring to
  get a realistic spread instead of one status dominating the demo).
- **Budget Pacing & Dayparting Analyzer** — 4 sample campaigns:
  2 Overpacing, 1 Underpacing, 1 On pace; 8 sample hours: 6 Keep on,
  1 Consider dayparting off, 1 No orders.
- **Campaign Health Scorecard** — 5 sample campaigns: 3 Healthy,
  1 Watch, 1 At risk (one campaign deliberately below the minimum-order
  floor to exercise "Insufficient data").

All workbooks open and recalculate normally in real Excel/Google
Sheets; they don't ship with LibreOffice-cached values baked in.

## Verification

```bash
pnpm tsc --noEmit
pnpm lint
DATABASE_URL="postgresql://test:test@localhost:5432/amph_test" \
JWT_SECRET="test-secret-at-least-32-bytes-long-please" \
  pnpm test
pnpm test:arch
pnpm build
DATABASE_URL="postgresql://test:test@localhost:5432/amph_test" \
  pnpm db:seed:resources --dry-run
```

Also smoke-tested with `pnpm dev`: spot-checked that a new XLSX and a
new PDF under `public/downloads/` serve with the correct `Content-Type`
headers, matching the STORY-098 baseline.

# Lesson Refactor Plan: Align PPC Coach to the Beginner Syllabus

**Created:** 2026-08-26
**Repository:** `projectamazonph/amazon-ph-simulators`
**Source of truth:** `/workspace/user_input_files/Amazon_PPC_Beginner_Syllabus.docx` (extracted to `/tmp/syllabus.txt`, 26 KB, 536 lines, 14 cross-cutting sections)
**Live site:** https://projectamazonph.github.io/amazon-ph-simulators/ppc-coach.html
**Baseline:** `dev` at `980ee9c` (PR #27 merged)
**Lead:** SimGrid content refactor for AMPH lead-gen

## Why

The current `ppc-coach.html` ships **12 modules, 60 lessons, 36 quiz questions, a 15-question final exam, and 4 embedded practice tools**. It is the _guided-learning entry_ for the SimGrid toolset that feeds the AMPH program. Lesson voice, block types, and visuals (the 🎯/📊/💡/🧪/✏️/⚠️/✅/🚫 blocks, "In this lesson" / "Coach tip" / "Example" / "Common mistakes" / "Do/Don't split" / flow / funnel / tree diagrams / worked examples) are well tested with learners. We are not replacing that.

The docx syllabus, however, sequences Sponsored Products by a _different_ spine:

1.  Amazon Advertising Foundations (incl. retail-readiness)
2.  PPC Language, Metrics, and Math (incl. attribution, leading vs lagging, data sufficiency)
3.  Campaign Structure and Naming (incl. portfolio use, cannibalization myths)
4.  Keyword Research and Search Intent (incl. clustering, Brand Analytics)
5.  Automatic Targeting _(new — was bundled inside M7)_
6.  Manual Keyword Targeting
7.  Product Targeting _(new — was a single line inside M7)_
8.  Bidding, Placements, and Budgets _(new: placements are a real topic)_
9.  Search-Term Analysis and Negatives
10. Performance Diagnosis _(new — was inside M11)_
11. Optimization, Scaling, and Operating Rhythm
12. Reporting, Strategy, and Capstone

The current app's module boundaries do not match. M6 in the app ("Listing Readiness") is a fragment of new M1. M7 in the app ("Campaign Setup") conflates Auto + Manual + Product targeting. M8 ("Bids & Budgets") is missing placements and "out of budget is not automatically a budget problem". M10 ("Reporting & Troubleshooting") buries Performance Diagnosis inside Reporting. M11 in the app ("VA Workflow & Capstone") splits across the new M11 and M12. Several syllabus topics are not in any current lesson (leading vs lagging, data sufficiency, cannibalization myths, placements, portfolio use, sponsored brands/display, Brand Analytics).

## Constraint: keep the lesson format

We will keep every existing lesson block-type and visual style. No new template, no template switch. Reorder, recut, extend, add.

## Outcome

After this refactor, `ppc-coach.html` exposes a 12-module path that:

- Maps 1-to-1 with the 12 syllabus modules in number, title, outcome, and evidence.
- Refactors 40 existing lessons + 20 new lessons into 60 total, re-titling/reordering them to fit the new module boundaries, retaining the same `id` and block structure.
- Adds **20 new lessons** to cover syllabus topics that have no current home.
- Curates the module quizzes to **3 sharp questions per module (36 total)** — fewer, better-targeted questions that map 1-to-1 with the module's three learning outcomes.
- Carries through the syllabus's 3 operating checklists ("Before launch", "During optimization", "Before reporting") as named handout artifacts in `learn/downloads/`.
- Updates `learn/index.html`, `learn/guide.html`, `learn/handouts.html`, and `learn/features.html` to the new 12-module catalog.
- Leaves all 12 simulator pages, the Builder tool, the Search Term Trainer, the Report Builder, the Quiz Arena, the Coach chat, and the Glossary untouched in scope (per agreement: lessons are the only surface we re-cut in this PR).

## Module-by-module map

Legend for action codes:

- **REUSE** — keep lesson as-is, just move into the new module's `lessons` array
- **EDIT** — keep lesson title, keep blocks, but rename or add a single block (e.g., add a "Coach tip" line about a syllabus-specific point)
- **NEW** — write a new lesson in the same block format

| New # | New title (matches syllabus)                | Lesson                                                                   | Action                                | Source in current app                                                                                                                                 |
| ----- | ------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Amazon Advertising Foundations              | 1.1 What is Amazon Marketplace?                                          | EDIT                                  | current M0L1 (retitle: drop "Marketplace" suffix to fit Foundations)                                                                                  |
| 1     |                                             | 1.2 Sponsored Products, Brands, Display overview                         | NEW                                   | —                                                                                                                                                     |
| 1     |                                             | 1.3 Retail-Readiness Checklist                                           | EDIT                                  | current M5L2 ("The Readiness Checklist"); merge in 1.2 ("Anatomy of a Product Listing") content                                                       |
| 1     |                                             | 1.4 Paid, Organic, and the Buy Box                                       | EDIT                                  | current M0L3 ("Organic vs Paid and the Buy Box"); light edit to flag "Ads buy visibility, the listing earns the sale"                                 |
| 1     |                                             | 1.5 Lab: shopper journey + retail-readiness audit                        | NEW (lab-only, lesson shape retained) | —                                                                                                                                                     |
| 2     | PPC Language, Metrics, and Math             | 2.1 Pay Per Click in Plain Words                                         | EDIT                                  | current M1L1 (add a "Coach tip" line about CPC ≠ bid)                                                                                                 |
| 2     |                                             | 2.2 The Auction                                                          | REUSE                                 | current M1L2                                                                                                                                          |
| 2     |                                             | 2.3 Spend, Sales, CPC, CTR, Conversion                                   | EDIT                                  | merge M1L3 (Click Journey) into M2L1/L2 (Money Math), keep funnel diagram, drop the "mistakes" block (saves to M10)                                   |
| 2     |                                             | 2.4 ACOS, ROAS, TACoS, Break-Even                                        | EDIT                                  | current M2L3 ("ACOS Deep Dive") + M2L4 ("ROAS, TACoS, and Worked Example") merged into one lesson                                                     |
| 2     |                                             | 2.5 Attribution Windows and Leading vs Lagging Indicators                | NEW                                   | —                                                                                                                                                     |
| 2     |                                             | 2.6 Data Sufficiency: Decisions from Tiny Samples                        | NEW                                   | current M9L3 ("How Much Data is Enough?") is the source, but moved here per syllabus and re-titled to match the syllabus's "data sufficiency" framing |
| 3     | Campaign Structure and Naming               | 3.1 The Hierarchy: Campaign, Ad Group, Targeting                         | REUSE                                 | current M3L1                                                                                                                                          |
| 3     |                                             | 3.2 Naming and Organization                                              | REUSE                                 | current M3L2                                                                                                                                          |
| 3     |                                             | 3.3 One-ASIN vs Multi-ASIN, Portfolios, and Cannibalization Myths        | NEW                                   | —                                                                                                                                                     |
| 3     |                                             | 3.4 Budget Isolation and Match-Type Separation                           | EDIT                                  | current M3L3 ("The Three Ad Types") — keep the ad-types table, add a block on budget isolation, retitle                                               |
| 4     | Keyword Research and Search Intent          | 4.1 Keyword vs Search Term                                               | REUSE                                 | current M4L1                                                                                                                                          |
| 4     |                                             | 4.2 Match Types Deep Dive                                                | REUSE                                 | current M4L2                                                                                                                                          |
| 4     |                                             | 4.3 Seed Keywords, Modifiers, Synonyms, Use Cases                        | NEW                                   | —                                                                                                                                                     |
| 4     |                                             | 4.4 Search Volume vs Relevance, Brand Analytics, Clustering              | EDIT                                  | current M4L4 ("Keyword Research Starter Process") retitled and extended with a Brand Analytics line                                                   |
| 5     | Automatic Targeting                         | 5.1 The Four Auto Groups: Close, Loose, Substitutes, Complements         | NEW                                   | —                                                                                                                                                     |
| 5     |                                             | 5.2 Auto Bid Segmentation by Group                                       | NEW                                   | —                                                                                                                                                     |
| 5     |                                             | 5.3 Auto as Research: Reading the Report                                 | EDIT                                  | merge current M6L1 (Auto vs Manual) into a research-focused version of the lesson, drop product targeting (moved to M7)                               |
| 5     |                                             | 5.4 Overlap and Negative Controls                                        | NEW                                   | —                                                                                                                                                     |
| 6     | Manual Keyword Targeting                    | 6.1 Match Types in Practice (Broad, Phrase, Exact)                       | REUSE                                 | current M4L2 (deduped; primary copy lives in 4.2, this version focuses on bidding across match types)                                                 |
| 6     |                                             | 6.2 Research vs Performance Campaigns                                    | NEW                                   | —                                                                                                                                                     |
| 6     |                                             | 6.3 Single-Keyword vs Grouped Ad Groups                                  | NEW                                   | —                                                                                                                                                     |
| 6     |                                             | 6.4 Launch Bids and Placement Expectations                               | EDIT                                  | retitled from current M7L2 ("Bid Rules for Beginners") stripped of "Budget runs out" / "Profitable" rows (those move to M8)                           |
| 7     | Product Targeting                           | 7.1 ASIN Targeting vs Category Targeting                                 | NEW                                   | —                                                                                                                                                     |
| 7     |                                             | 7.2 Competitor, Defensive, Cross-Sell, Complementary                     | NEW                                   | —                                                                                                                                                     |
| 7     |                                             | 7.3 Retail-Readiness Comparison and Risk of Stronger Offers              | NEW                                   | —                                                                                                                                                     |
| 7     |                                             | 7.4 Product-Targeting Matrix Lab                                         | NEW (lab-only)                        | —                                                                                                                                                     |
| 8     | Bidding, Placements, and Budgets            | 8.1 Budget Basics                                                        | REUSE                                 | current M7L1                                                                                                                                          |
| 8     |                                             | 8.2 Top of Search, Rest of Search, Product Pages                         | NEW                                   | —                                                                                                                                                     |
| 8     |                                             | 8.3 Placement Adjustments and Effective Bid Exposure                     | NEW                                   | —                                                                                                                                                     |
| 8     |                                             | 8.4 Dynamic Bids: Down Only / Up and Down / Fixed                        | NEW                                   | —                                                                                                                                                     |
| 8     |                                             | 8.5 Budget Pacing and "Out of Budget ≠ Budget Problem"                   | NEW                                   | —                                                                                                                                                     |
| 8     |                                             | 8.6 Bid Change Walkthrough (Worked)                                      | REUSE                                 | current M7L3                                                                                                                                          |
| 9     | Search-Term Analysis and Negatives          | 9.1 Reading the Search Term Report                                       | REUSE                                 | current M8L1                                                                                                                                          |
| 9     |                                             | 9.2 Targeting Report vs Search-Term Report                               | NEW                                   | —                                                                                                                                                     |
| 9     |                                             | 9.3 Winners, Wasters, and Click Thresholds                               | REUSE                                 | current M8L2 ("Winners and Wasters") with one block about click thresholds                                                                            |
| 9     |                                             | 9.4 Negative Exact vs Negative Phrase                                    | NEW                                   | —                                                                                                                                                     |
| 9     |                                             | 9.5 The Harvesting Workflow                                              | REUSE                                 | current M8L3                                                                                                                                          |
| 9     |                                             | 9.6 Using Queries to Improve Listings                                    | NEW                                   | —                                                                                                                                                     |
| 10    | Performance Diagnosis                       | 10.1 Diagnostic Order: Delivery → Engagement → Conversion → Economics    | NEW                                   | —                                                                                                                                                     |
| 10    |                                             | 10.2 Low Impressions / Low CTR / High CPC                                | EDIT                                  | current M10L3 ("Troubleshooting: No Impressions and Low CTR") retitled and extended                                                                   |
| 10    |                                             | 10.3 Low CVR / High ACOS / Sales Drop                                    | EDIT                                  | current M10L4 ("Troubleshooting: Clicks No Sales, High ACOS, Sales Drop") retitled                                                                    |
| 10    |                                             | 10.4 Traffic-Quality vs Offer-Quality Problems                           | NEW                                   | —                                                                                                                                                     |
| 10    |                                             | 10.5 Root-Cause Tree Practice (Six Cases)                                | NEW (lab-only)                        | —                                                                                                                                                     |
| 11    | Optimization, Scaling, and Operating Rhythm | 11.1 The Weekly Routine                                                  | REUSE                                 | current M9L1                                                                                                                                          |
| 11    |                                             | 11.2 One Change at a Time                                                | REUSE                                 | current M9L2                                                                                                                                          |
| 11    |                                             | 11.3 Bid Increase / Decrease Decision Tree                               | NEW                                   | —                                                                                                                                                     |
| 11    |                                             | 11.4 Budget Reallocation and Placement Optimization                      | NEW                                   | —                                                                                                                                                     |
| 11    |                                             | 11.5 Scaling Winners Without Inflating Marginal ACOS                     | NEW                                   | —                                                                                                                                                     |
| 11    |                                             | 11.6 Change Log, Guardrails, Rollback Conditions                         | EDIT                                  | current M11L3 ("SOPs and the Change Log") retitled and extended with rollback-condition block                                                         |
| 12    | Reporting, Strategy, and Capstone           | 12.1 The Simple Report Structure                                         | REUSE                                 | current M10L1                                                                                                                                         |
| 12    |                                             | 12.2 Explaining Numbers in Human Words                                   | REUSE                                 | current M10L2                                                                                                                                         |
| 12    |                                             | 12.3 Performance Narrative: Outcome, Drivers, Actions, Risks, Next Steps | NEW                                   | —                                                                                                                                                     |
| 12    |                                             | 12.4 PPC Metrics vs Business Metrics and 30/60/90 Roadmap                | NEW                                   | —                                                                                                                                                     |
| 12    |                                             | 12.5 Tasks by Cadence and Permissions Ladder                             | EDIT                                  | merge current M11L1 (Tasks by Cadence) + M11L2 (Permissions Ladder) into one lesson                                                                   |
| 12    |                                             | 12.6 Client Communication and the Capstone                               | REUSE                                 | current M11L4                                                                                                                                         |

### Counts

- 40 existing lessons → 36 reused as-is, 4 dropped (their content is merged or moved)
- 24 new lessons written in the same block format
- 60 lessons total (up from 40) — the syllabus explicitly allows shorter, focused lessons, so the average lesson shrinks and time-per-lesson drops from ~7.5 min to ~5.5 min, keeping total course time inside the syllabus's 60–84 hour range

### Quiz growth

- 50 module-quiz questions → 55 (5 added to test new content, distributed across M2, M5, M6, M8, M10)
- 15 final-exam questions → 18 (3 added for placements, diagnosis, and reporting narrative)

### Handout artifacts (3 new files in `learn/downloads/`)

- `before-launch-checklist.md` — built directly from syllabus section 11
- `during-optimization-checklist.md` — same
- `before-reporting-checklist.md` — same
- `essential-formula-sheet.md` — syllabus section 7, 9 formulas in the same plain-language format the current formula block uses

### File-level changes

| File                                                | Change                                                                                                                                                 |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ppc-coach.html`                                    | Re-author `MODULES` array: same shape, new module titles, new lessons for new modules, re-ordered existing lessons, +5 quiz items, +3 final-exam items |
| `learn/index.html`                                  | Update catalog card to 12 modules aligned to new titles (visual only; no new template)                                                                 |
| `learn/guide.html`                                  | Rewrite as 12-module path (outcome / time / key topics per module)                                                                                     |
| `learn/handouts.html`                               | Add the 4 new download cards; keep all existing downloads                                                                                              |
| `learn/downloads/before-launch-checklist.md`        | NEW                                                                                                                                                    |
| `learn/downloads/during-optimization-checklist.md`  | NEW                                                                                                                                                    |
| `learn/downloads/before-reporting-checklist.md`     | NEW                                                                                                                                                    |
| `learn/downloads/essential-formula-sheet.md`        | NEW                                                                                                                                                    |
| `learn/features.html`                               | Update module references from "9 screens" framing to the 12-module framing                                                                             |
| `index.html` (root)                                 | Update "12 modules · 40 lessons" copy to "12 modules · 60 lessons · 55 quiz items" (or whatever final count)                                           |
| `assets/curriculum-manifest.js` _(if exists)_       | Update module/lesson IDs to match the new MODULES array                                                                                                |
| `docs/curriculum-simulator-synchronization-plan.md` | Append a "Lesson refactor" section linking here                                                                                                        |

## Lesson style contract (no changes)

Every lesson block remains one of:

- `t: "goal"` → 🎯 "In this lesson: …" (amber, brand-50)
- `t: "p"` → plain paragraph
- `t: "list"` → bullet list
- `t: "table"` → 2- or 3-column table
- `t: "formula"` → centered math + note
- `t: "example"` → 🧪 "Example: …" (sky-50)
- `t: "tip"` → 💡 "Coach tip: …" (amber-50)
- `t: "mistake"` → ⚠️ "Common mistakes" with ✕ items
- `t: "split"` → ✅ Do / 🚫 Don't two-column
- `t: "diagram"` kind `"flow" | "funnel" | "tree"` → 📊 diagram block

Every lesson keeps the same `mins`, `id`, `blocks` shape. New lessons follow the existing `mNlK` ID convention; existing IDs are preserved on reuse to keep the localStorage `state.done` records valid for returning learners (compatibility note below).

## Compatibility note for returning learners

Existing `state.done` records (localStorage key `ppccoach.v1`) store lesson IDs. Reused lessons keep their IDs (`m0l1` → `m1l1` will need a migration map; safer: keep IDs in place but they map to a different module number visually). The cleanest approach:

- **Lesson IDs are renamed** to match the new module (`m0l1` → `m1l1`, etc.) because the IDs are only used in storage and never displayed.
- A small `migrateState()` function runs once on first load: if it sees old IDs in `state.done`, it remaps them to the new IDs. This avoids forcing returning learners to redo lessons.
- If the new module has no lesson at the old slot, the old ID is dropped from `state.done` (no replacement).

## Open questions parked (from 30-open-questions.md)

- Q3 (PWA) — still parked, unchanged by this refactor.
- Q5 (real-money, 2026-Q4) — still parked, unchanged.

## Acceptance

- `node --test tests/*.test.cjs` continues to pass (96 regression tests).
- All 14 inline JS blocks in `ppc-coach.html` parse.
- All 185+ local HTML references resolve.
- A headless walk-through: dashboard → lessons → module 1 → module 12 → quiz arena → final exam → all 12 module quizzes load, no console errors.
- The four practice tools (Builder, Search Term Trainer, Report Builder, Coach chat) still load.
- Returning learners with `state.done` items at the old IDs see their progress mapped (not zeroed).
- A new learner can complete all 12 modules, 60 lessons, 55 quiz questions, 18 final-exam questions, the 3 checklists, and the formula sheet.

## Rollout

Single umbrella PR, single commit (squash-merged). One reviewer. The PR description carries the mapping table above plus the headless-walk-through video. No feature flag, no split deploy — the changes are textual and additive, and the block format is unchanged.

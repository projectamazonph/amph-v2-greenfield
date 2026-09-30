# STORY-164: Lesson 1.5 one-page read view of the worksheet artifact

**Sprint:** Student artifacts
**Points:** 5
**Epic:** Student experience
**Owner:** Ryan (TBD)

**Status:** Not started. Designed but not built. STORY-163 ships the
five-part artifact (Lessons 1.1 through 1.5 each save a wide row to
`worksheet_entries`); this story adds the surface that consumes all
five rows and renders a single-page summary at the end of the
module. Defer until a learner retention question justifies the
build (per STORY-163 "Out of scope").

## Goal

Render the entire Profitability and Max-CPC Sheet on a single page
when the learner opens Lesson 1.5, drawing on the rows they wrote
in Lessons 1.1 through 1.4 plus the diagnosis row they fill in
during 1.5 itself. The page should fit the workbook role the
text-fence version played, but be readable instead of fill-in-able,
and show whether each row's numbers are consistent (price × CVR ×
target ACoS ≈ max CPC; margin = break-even ACoS; 1/margin ≈ min
ROAS).

## Source

- `docs/stories/STORY-163-worksheet-artifact.md` (the artifact itself).
- The learner's saved rows in `worksheet_entries` for
  `studentId = currentUser` and the five
  `WORKSHEET_LESSON_SLUGS`.

## Scope

### Where it lives

A new page at `src/app/courses/[slug]/lessons/1.5-metrics-in-practice/sheet/page.tsx`
(server component). Linked from the end of Lesson 1.5 with copy:
"Your one-page read of the Profitability and Max-CPC Sheet is
here."

### What it reads

`GetWorksheetUseCase.execute({ studentId })` from the production
container. Returns `readonly WorksheetEntry[]`, up to 5 rows.
The page server-renders all five parts in order; missing rows
render a "You haven't filled in Part N yet" placeholder that links
back to the relevant lesson.

### What it computes

For each row, surface the relationships that the math demands,
not just the values the learner typed:

- Part 2 (max CPC): show `price × CVR × target ACoS` next to the
  typed `maxCpc`. If they differ by more than 5%, flag with a
  warning callout ("your typed value diverges from the formula;
  recheck the math").
- Part 3 (break-even ACoS): confirm `breakEvenAcos` ≈ `profitMarginBeforeAds`.
  Same flag if they diverge.
- Part 4 (min ROAS): confirm `minimumRoas ≈ 1 / productProfitMargin`.
  Same flag.
- Part 5 (diagnosis): if `weeklyPattern` is set but `bottleneckMetric`
  is empty, flag "you named a pattern but no metric".
- Cross-part: if the `productName` in Part 1 differs from the
  productName inferred by the typed `price × CVR × maxCpc` math
  in Part 2, do not flag (they are independent fields). But if
  Part 5's `bottleneckMetric` references a metric the typed Part
  1/2/3 values contradict (e.g. bottleneck = "ACoS" but Part 3's
  ACoS is below margin), flag.

All formulas are pure functions. No additional IO. The flagging
logic lives in `src/domain/artifacts/worksheetConsistency.ts`
(next to the entity) and is unit-tested independently.

### What it does NOT do

- Edit any row. Editing happens through the existing `WorksheetArtifact`
  component on each lesson page; this story is read-only.
- Allow cross-student sharing. Still per-student.
- Export to CSV/JSON. Deferred to a follow-up if a learner asks.
- Re-issue the audit log row for the read. The page is a read;
  `RecordAuditLog` is for mutations.

### Acceptance checks

- `pnpm tsc --noEmit` clean.
- `pnpm lint` clean.
- `pnpm test`: new `WorksheetConsistency.test.ts` and the page's
  server-component test cover: empty-state (no rows), partial
  state (1.1 + 1.2 filled, 1.3-1.5 not yet), full state, and the
  four formula-divergence warning paths.
- `pnpm validate:lesson-production` still 45/45.
- A learner who finishes Lessons 1.1 through 1.5 with the new
  artifact can navigate to the read view from 1.5 and see all
  five parts rendered in one page, with consistency warnings
  where the typed math diverges from the formulas.

### Out of scope

- PDF export of the read view.
- Cross-student sharing or instructor review.
- A "lock in your answers" gate that prevents further edits after
  the read view is generated (the read view always reflects the
  current saved state).
- Mobile-first layout changes; the read view inherits the
  existing lesson page chrome.

## Verification

- The learner opens Lesson 1.5, completes the worksheet, clicks
  "See my one-page read", lands on the new page, and sees:
  - Part 1 raw metrics
  - Part 2 max CPC with the formula reproduced and a warning if
    the typed value diverges
  - Part 3 break-even ACoS with margin cross-check
  - Part 4 minimum ROAS with margin cross-check
  - Part 5 this week's diagnosis with a check that bottleneck and
    pattern match
- The page is bookmarkable and stable across reloads (rows are
  re-read from the database; no client state).
- Refreshing the read view after editing Part 1 shows the updated
  Part 1 numbers and re-runs the consistency warnings.

## Why this is in scope for the curriculum polish work

STORY-163 shipped the artifact and the per-lesson form. The
read view is the deliverable the learner actually takes away
from Module 1; without it the artifact is just a fancier text
fence. The polish standard the rest of the curriculum follows
treats Module 1 as a tool, not a textbook, and the one-page
read is what closes that loop.

## Open design questions

- Where exactly does the link from Lesson 1.5 live? Bottom of the
  page (after `## Client language`) or in a sidebar? Current
  intent: bottom CTA card, "Your one-page read is here" with
  the page URL. Confirm in implementation.
- Should the consistency warnings be soft (yellow callout) or
  hard (red, with the page refusing to render)? Current intent:
  soft. The learner is still learning; the warning teaches the
  formula even if they ignore it.
- Should the read view be one page or five tabs? Current intent:
  one page, with all five parts stacked. Printability matters
  for the workbook role.

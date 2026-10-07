# STORY-163: Module 1 worksheet as a tracked artifact

**Sprint:** Student artifacts

**Points:** 8

**Epic:** Student experience

**Owner:** Ryan (TBD)

**Status:** Not started. Designed but not built. Originated from the
observation in `docs/SHIPPED-AND-REMAINING.md` and `docs/STUDENT-FEATURE-GAP-ANALYSIS.md`
that the Profitability and Max-CPC Sheet (Lessons 1.1 to 1.5) is currently a
text-fence code block the learner is told to copy into a spreadsheet. The
artwork loses the cross-lesson continuity and gives the learner no way to
review their own decision history from one lesson to the next.

## Goal

Replace the per-lesson "open a blank note or spreadsheet" worksheets in
Lessons 1.1 to 1.5 with a single tracked artifact that the learner fills in
across all five lessons. The artifact carries state from one lesson to the
next, surfaces a one-page read on a real product by Lesson 1.5, and is
reusable as a job artifact on the next client.

## Source

- `docs/STUDENT-FEATURE-GAP-ANALYSIS.md`, "Worksheet artifact" item.
- `docs/SHIPPED-AND-REMAINING.md`, Module 1 worksheet gap.
- The "Profitability and Max-CPC Sheet" sections in Lessons 1.1, 1.2, 1.3,
  1.4, and 1.5 of `content/curriculum/modules/1-foundations/`.

## Scope

### Field inventory (34 fields across 5 lessons)

- **Lesson 1.1 (Part 1, 11 fields):** Product, Price, Campaign objective
  (launch / mature / branded-defense), This week's impressions, This week's
  clicks, This week's ad spend, This week's orders, This week's ad-attributed
  sales, This week's total sales, Data window (start date to end date),
  First question to investigate.
- **Lesson 1.2 (Part 2, 7 fields):** Product's CVR, Target ACoS, Maximum CPC
  (price x CVR x target ACoS), Actual CPC this week, Above or below maximum?,
  CTR this week, First check if CPC is above maximum (bid or targeting).
- **Lesson 1.3 (Part 3, 6 fields):** Manufacturing + shipping + fees (total
  cost to sell), Profit margin before ads, Break-even ACoS, This week's
  actual ACoS, Profit or loss per ad sale, This week's TACoS.
- **Lesson 1.4 (Part 4, 5 fields):** Product's profit margin, Minimum ROAS
  (1 / margin), Target ROAS with a safety cushion, This week's actual ROAS,
  Above or below minimum?.
- **Lesson 1.5 (Part 5, 5 fields):** This week's pattern (1-4 from this
  lesson), Bottleneck metric, Root cause to check first, One action this
  week, Next review date.

### Decisions (locked 2026-09-29)

- **Wide-row schema, 34 nullable columns.** Storage shape is one row per
  `(studentId, lessonSlug)`; all 34 value columns live on the row. A new
  field is a new column (forward migration). The field inventory is frozen
  by the curriculum polish work; widening to 34 was a measurement, not a
  drift.
- **Save on blur, full row.** `saveWorksheetEntry` accepts the full set of
  field values for the lesson; React holds local state and triggers a
  single upsert on blur. One fetch on load, one save on blur, zero
  round-trips while typing.
- **Fake repo at `src/infra/db/inmemory/InMemoryWorksheetRepository.ts`.**
  Matches the existing in-memory convention (`InMemorySentReminderRepository`,
  `InMemoryEmailVerificationRepository`, `InMemoryPasswordResetRepository`).
- **Branch rename.** `docs/story-163-worksheet-artifact` is renamed to
  `feat/worksheet-artifact` before any code commits land.
- **Voice cleanup is in-scope.** When a lesson's text-fence worksheet is
  replaced with the directive, any em-dashes inside the fence are silently
  replaced with periods, commas, or parentheses per AGENTS.md
  "Don't use em-dashes in copy."

### Architecture (follows the AGENTS.md "Adding a New Feature" recipe)

1. **Domain entity** at `src/domain/artifacts/worksheetEntry.ts`.
   - `WORKSHEET_LESSON_SLUGS` (5 entries), `WORKSHEET_FIELDS` map, and
     `validateWorksheetValues(lessonSlug, values)` that rejects unknown
     field keys and fills missing keys with `""` so the row is always wide.
   - The Prisma schema mirrors this: one `WorksheetEntry` row per
     `(studentId, lessonSlug)`, with 34 nullable string columns (11+7+6+5+5).
     Soft-delete via `deletedAt` per AGENTS.md "Every mutable Prisma model
     needs `deletedAt`".

2. **Port** at `src/ports/repositories/WorksheetRepository.ts`.
   - `findByStudent(studentId)` returns `readonly WorksheetEntry[]`
     (one row per lesson, up to 5 rows total).
   - `upsert({ studentId, lessonSlug, values, actorId, updatedAt })` is
     the only write path. No per-field or per-blob method; the row is
     the unit of write.

3. **Use cases** at `src/usecases/artifacts/`.
   - `GetWorksheetUseCase` (loads the student's five rows; returns them
     as-is from the port).
   - `SaveWorksheetEntryUseCase` accepts the full row, validates the
     field keys against the inventory, calls the port, then logs an
     `IAuditLog` row with action `worksheet.saved`. Audit failures are
     swallowed per AGENTS.md "RecordAuditLog should swallow db_error".

4. **Adapter** at `src/infra/repositories/PrismaWorksheetRepository.ts`.
   Prisma implementation. Test fake at
   `src/infra/db/inmemory/InMemoryWorksheetRepository.ts` (matches
   `InMemorySentReminderRepository` and the other in-memory adapters).

5. **Composition wiring** at `src/composition/container.ts` and
   `buildTestContainer()`.

6. **MDX directive** at `src/lib/mdx/directive-plugin.ts`.
   - New directive: `:::worksheet{id="..." title="..." part="N"}`.
   - Renders to `<div data-amph-block="worksheet" data-amph-part="N">` so
     the React side can hydrate.

7. **React component** at `src/components/lesson/WorksheetArtifact.tsx`.
   - Reads the part number from the directive attr.
   - For each field in the part, renders a labeled input.
   - On blur or debounced keystroke, calls a server action to save.
   - Pre-fills inputs with any existing values from the database (loaded
     by `GetWorksheetUseCase` server-side).
   - Component tests in `__tests__/WorksheetArtifact.test.tsx` covering
     save, load, validation, and a11y.

8. **Server action** at `src/app/actions/worksheet.action.ts`.
   - `saveWorksheetEntry({ studentId, lessonSlug, values })` takes the
     full row of field values for one lesson.
   - Calls `getSessionUserId()` per AGENTS.md auth rule; refuses when
     the caller is not the student named in `studentId`.
   - Calls `SaveWorksheetEntryUseCase`.
   - Logs to AuditLog per AGENTS.md "Every admin mutation logs" rule
     (treating student worksheet saves as a tier-2 mutation: who changed
     what and when, no admin-approval gate).

9. **MDX lesson edits** in `content/curriculum/modules/1-foundations/`.
   - Replace each existing text-fence worksheet block with a
     `:::worksheet{id="...part-N" part="N"}` directive.
   - Keep the explanatory prose ("This is Part N of your sheet from
     Lesson X.Y") as a normal paragraph above the directive.

### Acceptance checks

- `pnpm tsc --noEmit` clean.
- `pnpm lint` clean.
- `pnpm test`: new `SaveWorksheetEntryUseCase.test.ts` and
  `WorksheetArtifact.test.tsx` pass; all existing tests still pass.
- `pnpm test:e2e`: a Playwright journey that fills in all 34 fields
  across the 5 lessons and asserts persistence across page reloads.
- Migration applied cleanly to a fresh dev DB and to the staging seed.
- Architecture compliance test still passes (no layer-boundary imports).
- Voice test still passes (the new component does not introduce banned
  phrases in any UI string).
- A new worksheet artifact survives a page reload, a session change,
  and a Course re-enrollment.

### Out of scope

- Cross-student sharing or instructor review. The artifact is
  per-student only.
- PDF export. Defer to a follow-up STORY if a client asks.
- Worksheet history / audit trail beyond the AuditLog row. Defer until
  a learner retention question comes up.
- Real-time collaborative editing. Single-user write semantics only.

## Verification

- A learner who finishes Lessons 1.1 to 1.5 with the new artifact
  ends the module with a one-page read on a real product, persisted,
  and downloadable (CSV or JSON).
- The same artifact is reusable on the next client without manual
  copy.
- The validator's `pnpm validate:lesson-production` still reports 45/45
  lessons complete; the new `:::worksheet` directive is added to the
  allowed directive set.
- A regression test at
  `src/domain/curriculum/__tests__/WorksheetBlocks.test.ts` finds every
  `:::worksheet` directive in the tree, confirms one per lesson (5 total),
  asserts each `part` number matches the lesson number (Part 1 in 1.1,
  Part 2 in 1.2, etc.), and checks for valid `id` and `title`.

## Why this is in scope for the curriculum polish work

The current text-fence worksheet is the only piece of Module 1 that does
not match the polish standard set in PRs #632 to #637 (every lesson
has a pitfall callout + SelfCheck). The artifact is the artifact the
learner takes away from the module. Replacing the text-fence with a
real component completes the "Module 1 is a tool, not a textbook"
positioning the rest of the polish work assumes.

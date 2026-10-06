# STORY-163 Worksheet Artifact Implementation Plan

> **For Hermes:** This is the implementation plan for STORY-163 (Module 1 worksheet as a tracked artifact). Decisions locked in chat on 2026-09-29:
>
> 1. Wide-row Prisma model with **34** nullable columns (not 27 — the story doc was wrong; lessons actually carry 11 + 7 + 6 + 5 + 5 = 34 fields).
> 2. Em-dashes silently replaced during the lesson-edit commit.
> 3. `saveWorksheetEntry` takes a **full row** (one fetch on load, one save on blur).
> 4. Fake repo lives at `src/infra/db/inmemory/InMemoryWorksheetRepository.ts` (matches `InMemorySentReminderRepository`).
> 5. Branch is renamed from `docs/story-163-worksheet-artifact` to `feat/worksheet-artifact`.

**Goal:** Replace the text-fence worksheet in Lessons 1.1 to 1.5 with a single tracked artifact the learner fills in across all 5 lessons.

**Architecture:** Five layers, dependency inward (per AGENTS.md "Adding a New Feature" recipe). Wide-row Prisma model keyed by `(studentId, lessonSlug)` with 34 nullable string columns, soft-delete via `deletedAt`. Domain entity `WorksheetEntry`, port `WorksheetRepository`, use cases `GetWorksheetUseCase` + `SaveWorksheetEntryUseCase`, Prisma adapter, in-memory fake, MDX directive `:::worksheet{...}`, server-side prefilled React component `WorksheetArtifact`, server action calling `getSessionUserId()` + logging to `IAuditLog` with a new `worksheet.saved` action.

**Tech Stack:** Next.js App Router, Prisma 7 (PostgreSQL), Vitest, Playwright, the existing 5-line server-action convention, the existing remark-style `directivePlugin` extended with a `worksheet` directive.

---

## Verified repo state (2026-09-29)

- `main` is at `578a0d21671e3a7bccddac32abcd5c930e117573`, in sync with `origin/main`.
- Working tree clean on branch `docs/story-163-worksheet-artifact` (1 commit ahead of main: the design doc `dc64d374 docs: add STORY-163 for Module 1 worksheet-as-artifact`).
- No `Worksheet*` files exist anywhere in the repo (zero matches for `worksheet` and `*Worksheet*`).
- `src/infra/db/inmemory/` has 3 in-memory adapters; `src/infra/repositories/fake/` does not exist.
- `scripts/validate-lesson-production.ts` already supports a whitelist of allowed MDX directive names; `worksheet` will be added to it.
- AGENTS.md "Voice" rule: no em-dashes in product UI copy or commit messages. The current 1.1-1.5 worksheet fences contain em-dashes that will be silently replaced with periods, commas, or parentheses.

## Field inventory (34 fields, locked)

Part 1, Lesson 1.1 (11 fields):

- `productName`, `price`, `campaignObjective` (launch / mature / branded-defense), `weeklyImpressions`, `weeklyClicks`, `weeklyAdSpend`, `weeklyOrders`, `weeklyAdSales`, `weeklyTotalSales`, `dataWindow`, `firstQuestionToInvestigate`.

Part 2, Lesson 1.2 (7 fields):

- `productCvr`, `targetAcos`, `maxCpc`, `actualCpc`, `aboveOrBelowMax`, `weeklyCtr`, `firstCheckIfAboveMax` (bid or targeting).

Part 3, Lesson 1.3 (6 fields):

- `totalCostToSell`, `profitMarginBeforeAds`, `breakEvenAcos`, `weeklyActualAcos`, `profitOrLossPerAdSale`, `weeklyTacos`.

Part 4, Lesson 1.4 (5 fields):

- `productProfitMargin`, `minimumRoas`, `targetRoasWithCushion`, `weeklyActualRoas`, `aboveOrBelowMinimum`.

Part 5, Lesson 1.5 (5 fields):

- `weeklyPattern` (1-4), `bottleneckMetric`, `rootCauseToCheckFirst`, `oneActionThisWeek`, `nextReviewDate`.

---

## File plan (one concern per commit)

### Commit 1 — `docs(story-163): correct field count and add decisions`

**Files:**

- `docs/stories/STORY-163-worksheet-artifact.md` — patch.

**What changes:**

- "Field inventory (27 fields across 5 lessons)" → "(34 fields across 5 lessons)" with the corrected breakdown.
- "Fake* in `src/infra/repositories/fake/`" → "`src/infra/db/inmemory/InMemoryWorksheetRepository.ts`".
- Add a "Decisions (2026-09-29)" subsection listing: wide-row 34 columns, em-dash silent replace, full-row save on blur, branch rename, fake-repo path.
- Save semantics: replace "Use cases `SaveWorksheetEntryUseCase` (validates field key against the field inventory for the part, persists via port, returns Result)" with "Use case `SaveWorksheetEntryUseCase` accepts `{ lessonSlug, values: Record<fieldKey, string> }`, validates every key against that part's field inventory (rejects unknown keys with `invalid_field`), upserts the row, returns `Result<{ savedAt: Date }, WorksheetError>`."

**Verify:** `git diff --stat docs/stories/STORY-163-worksheet-artifact.md` shows the changed lines.

### Commit 2 — `chore(branch): rename docs/story-163-worksheet-artifact to feat/worksheet-artifact`

**Files:**

- (no file edits; pure git)

**What:** Branch already exists. AGENTS.md says `feat/*` for features. Rename it without touching the working tree.

**Step 1:** `git branch -m docs/story-163-worksheet-artifact feat/worksheet-artifact` (since the current branch is the only worktree on it).

**Step 2:** Verify: `git branch --show-current` returns `feat/worksheet-artifact`. `git status` clean.

### Commit 3 — `feat(domain): add WorksheetEntry entity`

**Files:**

- Create: `src/domain/artifacts/worksheetEntry.ts`
- Create: `src/domain/artifacts/__tests__/worksheetEntry.test.ts`

**Domain shape:**

```typescript
// src/domain/artifacts/worksheetEntry.ts

export const WORKSHEET_LESSON_SLUGS = [
  "1.1-read-ppc-data-before-you-change-it",
  "1.2-cpc-ctr",
  "1.3-acos-tacos-profitability",
  "1.4-roas-measuring-return",
  "1.5-metrics-in-practice",
] as const;
export type WorksheetLessonSlug = (typeof WORKSHEET_LESSON_SLUGS)[number];

export const WORKSHEET_FIELDS: Readonly<Record<WorksheetLessonSlug, readonly string[]>> = {
  "1.1-read-ppc-data-before-you-change-it": [
    "productName",
    "price",
    "campaignObjective",
    "weeklyImpressions",
    "weeklyClicks",
    "weeklyAdSpend",
    "weeklyOrders",
    "weeklyAdSales",
    "weeklyTotalSales",
    "dataWindow",
    "firstQuestionToInvestigate",
  ],
  "1.2-cpc-ctr": [
    "productCvr",
    "targetAcos",
    "maxCpc",
    "actualCpc",
    "aboveOrBelowMax",
    "weeklyCtr",
    "firstCheckIfAboveMax",
  ],
  "1.3-acos-tacos-profitability": [
    "totalCostToSell",
    "profitMarginBeforeAds",
    "breakEvenAcos",
    "weeklyActualAcos",
    "profitOrLossPerAdSale",
    "weeklyTacos",
  ],
  "1.4-roas-measuring-return": [
    "productProfitMargin",
    "minimumRoas",
    "targetRoasWithCushion",
    "weeklyActualRoas",
    "aboveOrBelowMinimum",
  ],
  "1.5-metrics-in-practice": [
    "weeklyPattern",
    "bottleneckMetric",
    "rootCauseToCheckFirst",
    "oneActionThisWeek",
    "nextReviewDate",
  ],
} as const;

export type WorksheetValues = Readonly<Record<string, string>>;

export interface WorksheetEntry {
  readonly studentId: string;
  readonly lessonSlug: WorksheetLessonSlug;
  readonly values: WorksheetValues; // all 34 keys present; missing = ""
  readonly updatedAt: Date;
}

export class WorksheetValidationError extends Error {
  constructor(public readonly invalidKeys: readonly string[]) {
    super(`unknown worksheet field keys: ${invalidKeys.join(", ")}`);
  }
}

/** Throws WorksheetValidationError on any key outside the part's allow-list. */
export function validateWorksheetValues(
  lessonSlug: WorksheetLessonSlug,
  values: Record<string, string>,
): WorksheetValues {
  const allowed = new Set(WORKSHEET_FIELDS[lessonSlug]);
  const invalid: string[] = [];
  for (const k of Object.keys(values)) {
    if (!allowed.has(k)) invalid.push(k);
  }
  if (invalid.length > 0) throw new WorksheetValidationError(invalid);
  // Fill in missing keys with "" so the row is always wide.
  const out: Record<string, string> = {};
  for (const k of allowed) out[k] = values[k] ?? "";
  return out;
}

export function isWorksheetLessonSlug(s: string): s is WorksheetLessonSlug {
  return (WORKSHEET_LESSON_SLUGS as readonly string[]).includes(s);
}
```

**Test file** `src/domain/artifacts/__tests__/worksheetEntry.test.ts` covers:

- `isWorksheetLessonSlug` accepts the 5 lesson slugs, rejects `"1.6-foo"`, `""`, `null`.
- `validateWorksheetValues` fills missing keys with `""` and rejects unknown keys.
- Total field count equals 34 (asserted: `Object.values(WORKSHEET_FIELDS).flat().length === 34`).
- Lesson-by-lesson field count assertions: 11, 7, 6, 5, 5.

**Verify:** `pnpm test src/domain/artifacts` (Vitest) — green.

### Commit 4 — `feat(ports): add WorksheetRepository port`

**Files:**

- Create: `src/ports/repositories/WorksheetRepository.ts`

```typescript
import type { Result } from "@/domain/shared/Result";
import type {
  WorksheetEntry,
  WorksheetLessonSlug,
  WorksheetValues,
} from "@/domain/artifacts/worksheetEntry";

export type WorksheetError = { kind: "db_error"; message: string };

export interface WorksheetRepository {
  /** Load all five rows (or fewer if the student hasn't opened every lesson). */
  findByStudent(studentId: string): Promise<Result<readonly WorksheetEntry[], WorksheetError>>;

  /** Upsert one row keyed by (studentId, lessonSlug). Soft-deletes via deletedAt. */
  upsert(args: {
    studentId: string;
    lessonSlug: WorksheetLessonSlug;
    values: WorksheetValues;
    actorId: string; // student or admin writing on the student's behalf
    updatedAt: Date;
  }): Promise<Result<{ savedAt: Date }, WorksheetError>>;
}
```

**Verify:** `pnpm tsc --noEmit` clean.

### Commit 5 — `feat(infra): add InMemoryWorksheetRepository fake`

**Files:**

- Create: `src/infra/db/inmemory/InMemoryWorksheetRepository.ts`

Match `InMemorySentReminderRepository` style: a class implementing the port with a `Map<string, WorksheetEntry>` keyed by `${studentId}::${lessonSlug}`. `upsert` overwrites; `findByStudent` returns one row per (studentId, lessonSlug). No `deletedAt` simulation — the in-memory adapter always returns live rows.

**Verify:** `pnpm tsc --noEmit` clean.

### Commit 6 — `feat(infra): add PrismaWorksheetRepository adapter`

**Files:**

- Modify: `prisma/schema.prisma` — add `WorksheetEntry` model at the end, before `// ── P3-87: in-app notifications`. Or after `CapstoneSubmission` to keep the existing flow.
- Create: `prisma/migrations/<timestamp>_worksheet_entries/migration.sql`
- Create: `src/infra/repositories/PrismaWorksheetRepository.ts`

**Prisma model (placed at the bottom of the schema, after CapstoneSubmission):**

```prisma
// STORY-163: per-student, per-lesson worksheet artifact. One row per
// (studentId, lessonSlug); 34 nullable string columns (11 + 7 + 6 + 5 + 5)
// capture the Profitability and Max-CPC Sheet fields across Module 1.
// The wide-row shape lets Lesson 1.5's read view run as one SELECT,
// and the field inventory is frozen by the curriculum polish work, so
// adding a column is a deliberate decision rather than an open-ended
// surface area. Same soft-delete + audit shape as LearnerArtefact.
model WorksheetEntry {
  id          String @id @default(cuid())
  studentId   String
  lessonSlug  String // one of WORKSHEET_LESSON_SLUGS in src/domain/artifacts/worksheetEntry.ts
  user        User   @relation(fields: [studentId], references: [id], onDelete: Cascade)

  // Part 1 (Lesson 1.1) — 11 columns
  productName              String?
  price                    String?
  campaignObjective        String?
  weeklyImpressions        String?
  weeklyClicks             String?
  weeklyAdSpend            String?
  weeklyOrders             String?
  weeklyAdSales            String?
  weeklyTotalSales         String?
  dataWindow               String?
  firstQuestionToInvestigate String?

  // Part 2 (Lesson 1.2) — 7 columns
  productCvr               String?
  targetAcos               String?
  maxCpc                   String?
  actualCpc                String?
  aboveOrBelowMax          String?
  weeklyCtr                String?
  firstCheckIfAboveMax     String?

  // Part 3 (Lesson 1.3) — 6 columns
  totalCostToSell          String?
  profitMarginBeforeAds    String?
  breakEvenAcos            String?
  weeklyActualAcos         String?
  profitOrLossPerAdSale    String?
  weeklyTacos              String?

  // Part 4 (Lesson 1.4) — 5 columns
  productProfitMargin      String?
  minimumRoas              String?
  targetRoasWithCushion    String?
  weeklyActualRoas         String?
  aboveOrBelowMinimum      String?

  // Part 5 (Lesson 1.5) — 5 columns
  weeklyPattern            String?
  bottleneckMetric         String?
  rootCauseToCheckFirst    String?
  oneActionThisWeek        String?
  nextReviewDate           String?

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?
  createdById String?
  updatedById String?

  @@unique([studentId, lessonSlug])
  @@index([studentId])
  @@map("worksheet_entries")
}
```

Also add the inverse relation on `User`:

```prisma
  worksheetEntries WorksheetEntry[]
```

(next to `learnerArtefacts LearnerArtefact[]` line ~111).

**Migration file** `<timestamp>_worksheet_entries/migration.sql`:

- `CREATE TABLE worksheet_entries (...)` matching the schema, with FK `student_id REFERENCES users(id) ON DELETE CASCADE`.
- Composite unique on `(student_id, lesson_slug)`.
- Index on `(student_id)`.
- All 34 value columns nullable `TEXT`.

**Adapter `PrismaWorksheetRepository.ts`:**

- Map `findByStudent` to `prisma.worksheetEntry.findMany({ where: { studentId, deletedAt: null } })`.
- Map each Prisma row to a domain `WorksheetEntry` by flattening the 34 columns into a `Record<string, string>` (missing → `""`).
- Map `upsert` to `prisma.worksheetEntry.upsert({ where: { studentId_lessonSlug: { studentId, lessonSlug } }, create: { ...flattenedCreate, createdById: actorId, updatedById: actorId }, update: { ...flattenedUpdate, updatedById: actorId } })`.

**Verify:** `pnpm exec prisma generate` clean, `pnpm tsc --noEmit` clean.

### Commit 7 — `feat(domain): add worksheet.audit Action constant + RecordAuditLog*

**Files:**

- Modify: `src/domain/values/AuditAction.ts` — add `"worksheet.saved"` and `"worksheet.save_failed"` to the type union and to `ALL_ACTIONS`.
- (No test changes needed; `isAuditAction` reads the same array.)

**Verify:** `pnpm tsc --noEmit` clean.

### Commit 8 — `feat(usecases): add GetWorksheetUseCase and SaveWorksheetEntryUseCase`

**Files:**

- Create: `src/usecases/artifacts/GetWorksheetUseCase.ts`
- Create: `src/usecases/artifacts/SaveWorksheetEntryUseCase.ts`
- Create: `src/usecases/artifacts/__tests__/GetWorksheetUseCase.test.ts`
- Create: `src/usecases/artifacts/__tests__/SaveWorksheetEntryUseCase.test.ts`

`GetWorksheetUseCase`: single method `execute({ studentId })`. Calls `repository.findByStudent(studentId)`. Returns `Result<readonly WorksheetEntry[], WorksheetError>` directly. Validates nothing; the adapter is responsible for shape.

`SaveWorksheetEntryUseCase`: `execute({ studentId, lessonSlug, values, actorId })`.

1. If `studentId !== actorId`, return `Result.err({ kind: "forbidden" })` — students cannot write each other's sheets; this matches AGENTS.md "Don't let students write each other's artefacts".
2. Call `validateWorksheetValues(lessonSlug, values)`; on `WorksheetValidationError`, return `Result.err({ kind: "invalid_field", invalidKeys })`.
3. Call `repository.upsert(...)`.
4. On success, call `auditLog.record({ action: "worksheet.saved", resource: "worksheet", resourceId: `${studentId}:${lessonSlug}`, payload: { lessonSlug, fieldCount: Object.keys(values).length } })`. Swallow `db_error` per AGENTS.md "RecordAuditLog should swallow db_error and log to console.error".
5. Return `Result.ok({ savedAt })`.

**Tests:**

- `GetWorksheetUseCase.test.ts`: empty repo returns `[]`; populated repo returns all five rows.
- `SaveWorksheetEntryUseCase.test.ts`:
  - Forbidden when `studentId !== actorId`.
  - Invalid keys rejected.
  - Happy path: upsert called with the validated values, audit row recorded, returned.
  - Audit failure swallowed (save still succeeds).

Use the `FakeWorksheetRepository` and `FakeAuditLog` patterns from existing use-case tests (look at `src/usecases/__tests__/`). `buildTestContainer()` does not yet exist for these — instantiate the dependencies manually like `LearnerArtefact`-style tests do.

**Verify:** `pnpm test src/usecases/artifacts` green.

### Commit 9 — `feat(composition): wire WorksheetRepository and use cases into container`

**Files:**

- Modify: `src/composition/container.ts` — add `worksheetRepository` (Prisma in prod, in-memory in test), `getWorksheet`, `saveWorksheetEntry` use cases.
- Modify: `src/composition/container.test.ts` — wire the in-memory fake into `buildTestContainer()` and add a property like `worksheetRepository: new InMemoryWorksheetRepository()`.

**Verify:** `pnpm tsc --noEmit` clean; `pnpm test src/composition` green.

### Commit 10 — `feat(mdx): add :::worksheet directive to directive-plugin.ts`

**Files:**

- Modify: `src/lib/mdx/directive-plugin.ts` — add a new directive `worksheet` that emits `<div data-amph-block="worksheet" data-amph-id="..." data-amph-lesson="..." data-amph-part="..." data-amph-title="..."></div>`. The directive body is empty (the React component renders its own UI based on the attribute values, just like `glossary`).
- Modify: `scripts/validate-lesson-production.ts` — add `"worksheet"` to `ALLOWED_DIRECTIVES`.

**Verify:** `pnpm exec vitest run src/lib` (the directive-plugin has tests); `pnpm validate:lesson-production` reports no new errors with a temporary `:::worksheet{id="test" title="x" part="1"}` line in a scratch MDX, then revert the scratch line. Or, do this verification after commit 12 lands.

### Commit 11 — `feat(lesson): add WorksheetArtifact React component`

**Files:**

- Create: `src/components/lesson/WorksheetArtifact.tsx`
- Create: `src/components/lesson/__tests__/WorksheetArtifact.test.tsx`

The component is `'use client'` (form state + debounced save). On mount, receives `lessonSlug`, `initialValues`, `fields` (label list), and `studentId`. Uses local state for each field. On blur per field, calls the server action with the **full row** of values. On save success, sets a "Saved at HH:MM" indicator.

```tsx
"use client";
import { useState } from "react";
import { saveWorksheetEntryAction } from "@/app/actions/worksheet.action";

export function WorksheetArtifact(props: {
  studentId: string;
  lessonSlug: string;
  partNumber: 1 | 2 | 3 | 4 | 5;
  title: string;
  fields: ReadonlyArray<{ key: string; label: string; placeholder?: string }>;
  initialValues: Readonly<Record<string, string>>;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const f of props.fields) out[f.key] = props.initialValues[f.key] ?? "";
    return out;
  });
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const res = await saveWorksheetEntryAction({
      studentId: props.studentId,
      lessonSlug: props.lessonSlug,
      values,
    });
    setSaving(false);
    if (res.ok) setSavedAt(new Date());
  }

  return (
    <form
      data-amph-block="worksheet"
      data-amph-lesson={props.lessonSlug}
      data-amph-part={props.partNumber}
      aria-label={props.title}
      onBlur={() => {
        save();
      }}
    >
      <h3>{props.title}</h3>
      {props.fields.map((f) => (
        <label key={f.key} className="block">
          <span>{f.label}</span>
          <input
            type="text"
            value={values[f.key] ?? ""}
            placeholder={f.placeholder}
            onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
          />
        </label>
      ))}
      <p aria-live="polite">
        {saving
          ? "Saving..."
          : savedAt
            ? `Saved at ${savedAt.toLocaleTimeString()}`
            : "Not saved yet"}
      </p>
    </form>
  );
}
```

**Test file** covers:

- Renders one input per field.
- Pre-fills inputs with `initialValues`.
- Typing updates state.
- Blur triggers `saveWorksheetEntryAction` exactly once with the full row.
- Saved-at indicator updates on success.

Stub `saveWorksheetEntryAction` in the test via `vi.mock("@/app/actions/worksheet.action", ...)`.

**Verify:** `pnpm test src/components/lesson` green.

### Commit 12 — `feat(actions): add saveWorksheetEntryAction server action`

**Files:**

- Create: `src/app/actions/worksheet.action.ts`

```typescript
"use server";

import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import {
  isWorksheetLessonSlug,
  type WorksheetLessonSlug,
  type WorksheetValues,
} from "@/domain/artifacts/worksheetEntry";

export type SaveWorksheetEntryResult =
  | { ok: true; value: { savedAt: string } }
  | { ok: false; error: { kind: string; invalidKeys?: readonly string[] } };

export async function saveWorksheetEntryAction(input: {
  studentId: string;
  lessonSlug: string;
  values: Record<string, string>;
}): Promise<SaveWorksheetEntryResult> {
  const actorId = await getSessionUserId();
  if (!actorId) return { ok: false, error: { kind: "unauthorized" } };
  if (actorId !== input.studentId) {
    return { ok: false, error: { kind: "forbidden" } };
  }
  if (!isWorksheetLessonSlug(input.lessonSlug)) {
    return { ok: false, error: { kind: "invalid_lesson" } };
  }
  const lessonSlug: WorksheetLessonSlug = input.lessonSlug;
  const container = buildContainer();
  const result = await container.saveWorksheetEntry.execute({
    studentId: actorId,
    lessonSlug,
    values: input.values as WorksheetValues,
    actorId,
  });
  if (!result.ok) {
    return {
      ok: false,
      error: {
        kind: result.error.kind,
        ...("invalidKeys" in result.error ? { invalidKeys: result.error.invalidKeys } : {}),
      },
    };
  }
  return { ok: true, value: { savedAt: result.value.savedAt.toISOString() } };
}
```

**Verify:** `pnpm tsc --noEmit` clean.

### Commit 13 — `feat(content): replace text-fence worksheets in 1.1-1.5 with :::worksheet directive`

**Files:**

- Modify: `content/curriculum/modules/1-foundations/1.1-read-ppc-data-before-you-change-it.mdx` — replace the 11-field text fence with `:::worksheet{id="1.1-profitability-sheet" title="Part 1 of your Profitability and Max-CPC Sheet" part="1"}`. Keep the explanatory prose "Open a blank note or spreadsheet..." paragraph above.
- Modify: `content/curriculum/modules/1-foundations/1.2-cpc-ctr.mdx` — 7 fields.
- Modify: `content/curriculum/modules/1-foundations/1.3-acos-tacos-profitability.mdx` — 6 fields.
- Modify: `content/curriculum/modules/1-foundations/1.4-roas-measuring-return.mdx` — 5 fields.
- Modify: `content/curriculum/modules/1-foundations/1.5-metrics-in-practice.mdx` — 5 fields.

Also, silently replace any em-dashes (`—` U+2014) found in those fences with periods, commas, or parentheses.

**Verify:** `pnpm validate:lesson-production` still reports 45/45 lessons complete; `pnpm exec vitest run src/domain/curriculum/__tests__/SelfCheckBlocks.test.ts` still green; new `WorksheetBlocks.test.ts` (created in commit 14) green.

### Commit 14 — `test(validator): add WorksheetBlocks regression test`

**Files:**

- Create: `src/domain/curriculum/__tests__/WorksheetBlocks.test.ts`

Mirror the `SelfCheckBlocks.test.ts` pattern:

- Find every `:::worksheet{...}` block across the curriculum.
- Assert every block has an `id`, a `part` matching a valid `1..5`, and a `title`.
- Assert every block is in one of the 5 lesson files (no leakage).
- Assert each lesson has exactly one block and the part number matches the lesson number (Part 1 in 1.1, Part 2 in 1.2, …).
- Assert total directive count is 5.

**Verify:** `pnpm test src/domain/curriculum` green.

### Commit 15 — `chore(seed): no change needed; existing seeders ignore the new table`

**Files:** none.

The `seed-all-content.mjs` writes lessons and quizzes from MDX/JSON. The new table is empty by default; the React component fetches on mount and creates rows lazily via the save action. No seeder changes required. Verify by re-reading `scripts/seed-all-content.mjs` and confirming it touches only `Lesson` / `Module` / `Course` / `Quiz*`.

### Commit 16 — `test(e2e): Playwright journey for Module 1 worksheet artifact`

**Files:**

- Create: `tests/e2e/module1-worksheet.spec.ts` (new spec, not added to existing `critical-journeys.spec.ts`).

The journey:

1. Sign in as a seeded student (use the existing seeded test student pattern from `tests/e2e/critical-journeys.spec.ts`).
2. Navigate to `/courses/<foundations-slug>/lessons/1.1-read-ppc-data-before-you-change-it`.
3. Fill 11 fields, blur, assert save indicator appears.
4. Reload page, assert values persist.
5. Navigate to 1.2 → 1.5, fill the remaining 23 fields.
6. Return to 1.5; assert a "Full sheet" view (or whatever the read view ends up being — defer this assertion if the read view isn't built; the spec just needs to assert persistence + cross-lesson continuity).
7. Run the validator: `pnpm validate:lesson-production`.

**Verify:** `pnpm test:e2e` green (run against the local dev server).

---

## Verification gates (final)

Run all in order. None can fail.

1. `pnpm tsc --noEmit` — zero type errors.
2. `pnpm lint` — zero ESLint errors (includes `local/no-ai-slop` and the boundary rules).
3. `pnpm test` — all unit and integration tests pass (existing 5,208 + the new worksheet tests).
4. `pnpm test:e2e` — Playwright suite passes.
5. `pnpm build` — production build succeeds.
6. `pnpm validate:lesson-production` — 45/45 lessons complete.
7. `gitleaks detect` — no secrets.
8. Architecture compliance test — boundary rules pass with the new module.

## Risks / open questions

- **Schema migration on existing prod DB.** Production has the 37-model baseline. The new `WorksheetEntry` table is a forward-only addition; no data backfill. Migration is forward-compatible.
- **The read view on Lesson 1.5.** Story says "one-page read on a real product by Lesson 1.5". This plan's `WorksheetEntry` shape supports it (one row per (student, lesson) = 5 rows total). The actual read-view component is deferred to a follow-up — the directive's job in this PR is to capture the 5 parts. The Playwright e2e asserts the fields are saved and reload-persistent, not the read view itself.
- **Component name `WorksheetArtifact`.** Per AGENTS.md "Use AMPH brand wrappers first, then Astryx"; this component uses the existing `<input>` and basic `<label>` structure, matching the in-line tone of the lesson pages. If `astryx build "worksheet"` returns an existing kit, defer to that; otherwise this layout stands.
- **Branch rename (commit 2).** Force-push the renamed branch to the remote? If a PR was opened from `docs/story-163-worksheet-artifact`, the remote's tracking branch has to be deleted first (`git push origin --delete docs/story-163-worksheet-artifact`). Confirm before pushing.

## What I'm NOT doing in this PR

- A separate "One-page read" component for Lesson 1.5. The directive's job is to capture. Read view is a follow-up STORY.
- Cross-student sharing, instructor review, PDF export, history. All explicitly out of scope in the original story doc.
- Migration of the existing three in-memory repos to a new path. Follows the existing convention.

## Execution approach

After you approve this plan, I'll execute via the **subagent-driven-development** skill:

- Fresh subagent per commit (16 commits → 16 short sessions).
- Spec compliance review after each commit (does the diff match this plan?).
- Code quality review after spec passes.
- Proceed only when both reviews approve.

I'll batch independent commits where it makes sense (e.g. commits 3-4-5 are pure creation, can be a single session).

When the branch is ready, I'll push and open the PR with `gh pr create` against `main`, with a body that points at this plan and the story doc.

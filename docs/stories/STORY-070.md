# STORY-070: Listing Audit Rebuild — Scoring Engine Integration

## Context

STORY-040 shipped the original Listing Audit + Keyword Research simulator. It audits a
title/bullets/description against a niche and generates a prioritized keyword list. It has
no concept of user submission, per-dimension scoring, or the attempt lifecycle.

This is the last of the four simulator rebuilds (STORY-067 STR Triage, STORY-068 Bid
Elevator, STORY-069 Campaign Builder). It follows the exact same pattern: the simulator
generates ground truth AND per-dimension scores when a user-revised listing is supplied.
A new `listingAuditAttempt()` server action wires it into the full lifecycle.

**Also fixes a live bug:** `scripts/seed-simulator-policies.ts` seeds `listing-audit`
policies with STR Triage dimension names (`direction`, `profitability`,
`dataSufficiency`). Those dimensions do not exist for Listing Audit, so grading would
fail with `invalid_dimensions`. Same class of bug fixed for bid-elevator in STORY-068 and
campaign-builder in STORY-069.

## Design

### Grading concept

Listing Audit grades a student's **revised** listing against the audit findings produced
for the **original** listing. The student is given a weak listing, reads the findings, then
submits a revision. The simulator audits the revision and scores how much of the original
weakness the student actually resolved.

Ground truth = the audit of the original listing (the findings the student should have
fixed). User submission = `userRevisedListing`. Dimensions measure improvement, not
absolute quality, so a student who lifts a bad listing substantially scores well even if
the result is not perfect.

### Scoring dimensions for Listing Audit

| Dimension         | Description                                                      | Rubric                                                                                                                            |
| ----------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `titleQuality`    | Did the revision improve the title?                              | Revised `titleScore` mapped against the original: 100 when revised ≥ 80, else `round(revisedTitleScore)`; floor 0                  |
| `bulletQuality`   | Did the revision improve the bullets?                            | Same mapping on `bulletScore`                                                                                                     |
| `keywordCoverage` | Do the revised title + bullets cover the high-priority keywords? | % of `priority: "high"` keywords whose terms appear in the revised title or bullets, ×100                                          |
| `findingsFixed`   | How many original findings were actually resolved?               | `(originalFindingCount - revisedFindingCount) / originalFindingCount × 100`, clamped 0–100; 100 when the original had no findings   |
| `explanation`     | Placeholder (future rubric-based on written justification)       | Always 100                                                                                                                        |

`score` when grading = `findingsFixed` (primary dimension — it is the one that directly
measures whether the student acted on the audit).

### Flow

```
User input (title + bullets + description + category + niche)
  + optional userRevisedListing (the student's revised title/bullets/description)
  → validate
  → StartSimulatorAttempt (creates attempt record)
  → ListingAuditSimulator.run(input with userRevisedListing)
    → audits the ORIGINAL listing → ground-truth audit + findings + keywords
    → if userRevisedListing provided: audits the revision, computes per-dimension scores
    → returns audit + keywordResearch + scoreDimensions (null if no revision)
  → GradeSimulatorAttempt(attemptId, scoreDimensions)
  → ComposeAttemptFeedback(attemptId)
  → return result with ground-truth audit + feedback
```

### Backward compatibility

The existing `auditListing()` server action is kept unchanged in behavior. It calls the
simulator directly with no revision, so `scoreDimensions` is always `null` and `score`
stays `overallScore` (existing behavior). `ListingAuditForm.tsx` keeps working untouched.

## Code shape

### Domain

**`src/domain/simulator/listing-audit/ListingAuditOutput.ts`** (overwrite)

- `ScoreDimensions` interface: `titleQuality`, `bulletQuality`, `keywordCoverage`,
  `findingsFixed`, `explanation` — all `number`
- `ListingAuditOutput`: existing fields + `scoreDimensions: ScoreDimensions | null`
- `audit` is always the audit of the **original** listing (ground truth). The revision's
  audit is internal to the dimension computation and is not part of the output surface.

**`src/domain/simulator/listing-audit/ListingAuditInput.ts`** (overwrite)

- New `RevisedListing` interface: `title: string`, `bullets: readonly string[]`,
  `description: string`
- `ListingAuditInput`: existing fields + optional `userRevisedListing?: RevisedListing`

**`src/domain/simulator/listing-audit/ListingAuditSimulator.ts`** (overwrite)

- Keep `auditTitle`, `auditBullets`, `generateKeywords` and the description/backend
  finding logic exactly as-is. Extract the whole audit body into a private
  `auditListing(title, bullets, description, niche)` helper returning
  `{ audit, findings }` so it can run twice (original + revision) with no duplication.
- After auditing the original: if `userRevisedListing` is provided, audit the revision and
  compute:
  - `titleQuality`: revised title score, 100 if ≥ 80
  - `bulletQuality`: revised bullet score, 100 if ≥ 80
  - `keywordCoverage`: share of high-priority keywords covered by revised title + bullets
    (case-insensitive substring match on the keyword string)
  - `findingsFixed`: reduction in finding count vs the original, as a percentage
  - `explanation`: 100
- `score = findingsFixed` when grading, else `overallScore` (unchanged)
- The empty-input guard (`!niche && !title`) must also return `scoreDimensions: null`

### Infrastructure

**`scripts/seed-simulator-policies.ts`** (fix in place)

Replace the three `listing-audit` policies' `dimensionConfig`. They currently use
`direction` / `profitability` / `dataSufficiency`, which do not exist for this simulator.

- beginner/practice: `titleQuality` 0.25, `bulletQuality` 0.25, `keywordCoverage` 0.20,
  `findingsFixed` 0.30 — thresholds 50, passingScore 50
- intermediate/practice: same weights — thresholds 65, passingScore 65
- advanced/practice: `titleQuality` 0.20, `bulletQuality` 0.20, `keywordCoverage` 0.20,
  `findingsFixed` 0.30, `explanation` 0.10 — thresholds 80 (explanation 70),
  passingScore 80

### App layer

**`src/app/tools/listing-audit/actions.ts`** (append; do not alter `auditListing`)

- `ListingAuditAttemptInput`: title, bullets, description, category, niche, optional
  `scenarioId`, optional `mode` (defaults `"practice"`), optional `userRevisedListing`
- `ListingAuditAttemptResult`: attemptId, overallScore, scoreDimensions, isPassed, audit,
  keywordResearch, feedback — mirroring `CampaignBuilderAttemptResult`
- `listingAuditAttempt()`: full lifecycle (validate with zod → start → run → grade →
  compose feedback → return), same error kinds as campaign-builder
  (`validation_error` | `attempt_error` | `grading_error` | `feedback_error`)
- `isPassed`: `scoreDimensions !== null ? findingsFixed >= 50 : false`
- Use `getContainer()` for the new action. Leave the legacy action's `buildContainer()`
  call alone to avoid changing existing behavior.

### Tests

**`tests/unit/domain/simulator/listing-audit/ListingAuditSimulator.test.ts`** (extend)

- Preview: no `userRevisedListing` → `scoreDimensions` is `null`, `score === overallScore`
- Empty input guard still returns `scoreDimensions: null`
- `titleQuality`: strong revised title → 100; weak revised title → scales down
- `bulletQuality`: 5 rich bullets → 100; 1 short bullet → scales down
- `keywordCoverage`: revision containing all high-priority keyword terms → 100; none → 0
- `findingsFixed`: revision that clears every finding → 100; revision identical to the
  original → 0; original with no findings → 100
- `score === findingsFixed` when grading
- Edge: revision with empty bullets array, revision with empty title

**`src/app/tools/listing-audit/__tests__/actions.test.ts`** (new)

- `listingAuditAttempt()`: validation failure, happy path with revision, preview mode
  (no revision → no grading call, feedback null), start error, grade error, feedback error
- `auditListing()` legacy: validation + happy path still pass unchanged

## Acceptance criteria

- [ ] `ListingAuditOutput` has `scoreDimensions: ScoreDimensions | null`
- [ ] `ListingAuditInput` accepts optional `userRevisedListing`
- [ ] Simulator computes all five dimension scores when `userRevisedListing` provided
- [ ] Preview mode (no revision) returns `scoreDimensions: null` and unchanged `score`
- [ ] Audit logic is extracted to one helper and runs identically for original + revision
- [ ] `seed-simulator-policies.ts` listing-audit policies use the real dimension names
- [ ] `listingAuditAttempt()` follows full lifecycle: start → run → grade → compose feedback
- [ ] Legacy `auditListing()` still works unchanged; `ListingAuditForm.tsx` untouched
- [ ] All simulator tests pass; new action tests pass
- [ ] `pnpm typecheck` → 0 errors
- [ ] `pnpm lint` → 0 errors on new code
- [ ] Architecture tests still pass (0 violations)
- [ ] PR against `main`, CI green, squash merge

## DoD

- Code matches the spec above
- `pnpm typecheck && pnpm lint && pnpm test` all green
- Conventional commit: `feat(simulator): STORY-070 Listing Audit rebuild — scoring engine integration`
- PR opened, squash-merged to `main`
- `SESSION-HANDOVER.md` updated; Sprint 13 table marks STORY-070 merged

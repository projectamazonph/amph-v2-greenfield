# STORY-087: Explicit business-impact feedback

**Points:** 1 (sized), title-only entry with no acceptance criteria in `docs/sprint-plan.md`.
**Epic:** Sprint 16 — Assessment Platform Maturity.

## Status

**Status:** Done — 2026-08-04.

## Scope decision

The story had no acceptance criteria beyond its title. Research found the real gap: this session
asked the user to choose between two options, and the user picked the smaller one —
**"Rewrite templates only"**: fix the stale dimension-name keys in the feedback engine so every
simulator's real score dimensions get honest, concrete, business-impact-framed copy, with no new
UI and no changes to `composeAttemptFeedback()`'s overall pass/fail messaging.

## What was found

`src/domain/entities/AttemptFeedback.ts`'s `DIMENSION_COMMENTS`/`DIMENSION_RECOMMENDATIONS`
lookup tables were still keyed to dimension names from before STORY-071/072/076 renamed or
removed them: `direction` (used, at the time, as a bid-elevator-specific concept, since renamed
to `bidAccuracy` for that simulator and repurposed as a different, real dimension for str-triage
and listing-audit), `magnitude`, `dataSufficiency`, `profitability` (partially — the name
survived for str-triage but the old copy didn't match its new meaning), and `explanation` (a
dimension removed outright by STORY-071/072, since `reviewCoverage` became the non-gradable
submission gate).

The practical effect: for 4 of the 5 simulators (campaign-builder, listing-audit,
keyword-research, and most of bid-elevator/str-triage's real dimensions), essentially every
graded attempt's dimension feedback fell through to the generic fallback strings:

```ts
comment: `Score of ${rawScore} on ${dimension}.`;
recommendation: `Review your approach to ${dimension} and practice with simpler scenarios.`;
```

This was invisible because no existing test asserted exact comment/recommendation content — only
`toBeTruthy()` / non-empty-string checks, which the fallback strings also satisfy.

## What shipped

- `DIMENSION_COMMENTS`/`DIMENSION_RECOMMENDATIONS` changed from `Record<string,
Record<FeedbackVerdict, string>>` to `Record<string, Record<FeedbackVerdict, (score: number) =>
string>>`, keyed to the 11 real dimension names verified against each simulator's actual
  `ScoreDimensions` interface:
  - bid-elevator: `bidAccuracy`, `budgetAdherence`, `roasHit`
  - campaign-builder: `structureQuality`, `budgetAllocation`, `keywordRelevance`
  - listing-audit: `direction`, `priorityCoverage` (+ shared `reviewCoverage`, no entry — see below)
  - str-triage: `direction`, `profitability` (+ shared `reviewCoverage`, no entry)
  - keyword-research: `intentAccuracy`, `negativeIdentification`
- Each dimension has 4 verdict-keyed copy functions (`excellent`/`good`/`fair`/`poor`) that
  interpolate the real score and describe the concrete business consequence of that score band
  (e.g. budget drifting to the wrong keywords, overpriced clicks starving converting terms,
  missed findings that would ship to a live listing) rather than restating the score abstractly.
  No dollar figures are fabricated — the domain layer only has access to `scoreDimensions`
  percentages at feedback-compose time, not the richer transient numbers computed inside each
  simulator's grading action.
- `reviewCoverage` deliberately has no template entry in either table: it's a non-gradable
  submission gate (`NON_GRADABLE_DIMENSIONS`, STORY-072) that never reaches
  `GradeSimulatorAttempt`, so it can never appear in a graded attempt's `scoreDimensions` and the
  fallback path is unreachable for it in practice.
- `composeAttemptFeedback()`'s call site updated to invoke the looked-up entry as a function with
  `rawScore` instead of a plain object property read.
- New regression test (`tests/unit/domain/entities/AttemptFeedback.test.ts`) —
  `it.each` over all 11 real dimension names, asserting each produces non-generic-fallback
  comment/recommendation text and that the comment contains the interpolated score.

## Known limitations (deliberately out of scope, per the chosen option)

- No new UI — this is a pure copy/data change inside the existing feedback rendering path.
- `OVERALL_PASS_COMMENT`/`OVERALL_FAIL_COMMENT`/`REMEDIATION_LINKS` (simulator-level, not
  dimension-level messaging) were left unchanged — they weren't stale.
- Pre-existing tests that use old dimension names like `magnitude` as a `scoreDimensions` key
  (representing scenarios that no real simulator can actually produce, since no simulator emits
  that key anymore) still resolve to the generic fallback — unchanged, since those tests only
  assert non-empty content, not exact copy, and fixing them isn't part of this story's scope.

## Verification

```bash
pnpm tsc --noEmit
pnpm lint
DATABASE_URL="postgresql://test:test@localhost:5432/amph_test" \
JWT_SECRET="test-secret-at-least-32-bytes-long-please" \
  pnpm test       # 338 files / 3595 passed / 2 skipped
pnpm test:arch    # 13 files / 629 passed
pnpm build        # succeeds
```

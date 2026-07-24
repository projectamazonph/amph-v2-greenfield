# STORY-067 — STR Triage Rebuild (Scoring Engine Integration)

## Status

**Status:** 🔨 In progress

## Context

STORY-038 built the original STR Triage simulator as a standalone tool — `StrTriageSimulator.run()` returns ground-truth keyword classifications and a flat `score: 100` (no real scoring). STORY-065 introduced the `GradeSimulatorAttempt` use case and `ScorePolicy` with per-dimension scoring. STORY-066 added `ComposeAttemptFeedback` for actionable student feedback.

STORY-067 rebuilds STR Triage to integrate with the attempt + grading + feedback flow:

1. `StrTriageOutput` gets `scoreDimensions` — the simulator evaluates user choices against ground truth and returns per-dimension scores
2. `str-triage` action computes dimension scores from user vs. ground-truth comparison and calls `GradeSimulatorAttempt`
3. `ComposeAttemptFeedback` is called after grading to give students per-dimension feedback
4. `ScorePolicy` records are created for `str-triage` beginner/intermediate/advanced + practice/credential modes
5. STR Triage now follows the same attempt lifecycle as Bid Elevator: start → decide → submit → grade → feedback

## User Flow (rebuilt)

1. User opens `/tools/str-triage`
2. Page renders 20 search term rows with per-row action selector (keep/pause/add_as_exact/add_as_phrase)
3. User classifies all rows and clicks Submit
4. Action: `strTriageAttempt()` — creates attempt, computes `scoreDimensions`, grades via `GradeSimulatorAttempt`, composes feedback via `ComposeAttemptFeedback`
5. Results page shows: per-keyword classifications, overall score, per-dimension breakdown, remediation links

## Acceptance Criteria

### Simulator

1. `StrTriageOutput` gains `scoreDimensions: Record<string, number>` (keys: `direction`, `profitability`, `dataSufficiency`, `explanation`)
2. `StrTriageSimulator.run()` accepts `StrTriageInput` with `userClassifications?: Record<string, TriageAction>` and computes dimension scores when user classifications are provided
3. `StrTriageOutput.classifications` includes both `groundTruth` and `userChoice` per keyword
4. `direction` score = % of keywords correctly classified (exact match)
5. `profitability` score = weighted avg ROAS of correctly kept/added keywords vs. wrongly paused keywords
6. `dataSufficiency` score = 100 if user reviewed all rows; lower if they skipped rows
7. `explanation` score = 100 (future: rubric-based on written justification)

### Action

8. `str-triage.action.ts` replaces `classifyStr()` — new `strTriageAttempt()` function:
   - Calls `StartSimulatorAttempt` to create an attempt
   - Calls simulator with user classifications to get `StrTriageOutput` (with `scoreDimensions`)
   - Calls `GradeSimulatorAttempt` with the computed dimension scores
   - Calls `ComposeAttemptFeedback` to generate student feedback
   - Returns `{ attemptId, overallScore, scoreDimensions, isPassed, feedback }`
9. Input: `{ rows: StrSeedRow[], userActions: Record<string, TriageAction> }` via FormData

### ScorePolicy

10. `ScorePolicy` records for `str-triage`:
    - Beginner/practice: direction=0.4, profitability=0.4, dataSufficiency=0.2; passingScore=70
    - Beginner/credential: direction=0.3, profitability=0.4, dataSufficiency=0.2, explanation=0.1; passingScore=75
    - Intermediate: direction=0.3, profitability=0.5, dataSufficiency=0.2; passingScore=72
    - Advanced: direction=0.3, profitability=0.5, dataSufficiency=0.1, explanation=0.1; passingScore=75
11. Policies seeded via `scripts/seed-simulator-policies.ts`

### Feedback

12. `AttemptFeedback` domain already has STR Triage-specific templates in `OVERALL_PASS_COMMENT` / `OVERALL_FAIL_COMMENT` — no change needed
13. Remediation links already correct for `str-triage` simulator

### Tests

14. `StrTriageSimulator.test.ts` — 18 tests covering dimension scoring for all classification scenarios
15. `str-triage.action.test.ts` — 8 tests covering happy path, all grading error cases, and feedback composition

## Code Shape

```
src/
  domain/
    simulator/
      str-triage/
        StrTriageOutput.ts       # add scoreDimensions, groundTruth, userChoice
  app/
    tools/
      str-triage/
        page.tsx                # unchanged (server component, reads scenario)
        actions.ts              # replace classifyStr() with strTriageAttempt()
        page.test.tsx          # update for new action response shape
        __tests__/
          actions.test.ts       # new: strTriageAttempt tests

scripts/
  seed-simulator-policies.ts    # seed ScorePolicy records for all simulators + difficulties

tests/
  unit/
    domain/
      simulator/
        str-triage/
          StrTriageSimulator.test.ts  # new: dimension scoring tests
```

## Pitfalls

- The simulator scoring must not give hints before the user submits — `scoreDimensions` only appear in the result, not during input
- Dimension scores must be consistent with `getOverallScore()` in `ScorePolicy` — verify by testing
- `str-triage` action must handle the case where `ScorePolicy` doesn't exist yet (degrade gracefully, compute flat score without weighting)

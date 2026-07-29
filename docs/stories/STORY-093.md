# STORY-093 — Fix Quiz UI: Expose correctCount + totalQuestions

## Status

- **Story**: STORY-093
- **Sprint**: ad hoc
- **Points**: 1
  **Status:** Done

## Bug

The `QuizPlayer` component at `src/components/courses/QuizPlayer.tsx` shows the result screen with:

```
result.correctCount of result.totalCount correct.
```

Both values are `undefined` — the API never returns them. The student sees "undefined of undefined correct" instead of "7 of 10 correct."

The chain:

1. `completeQuizAttempt` (QuizAttempt.ts:120) computes `correctCount` and `totalQuestions` but returns only the mutated `QuizAttempt` entity — those two values are discarded.
2. `RecordQuizAttempt` use case result type has no `correctCount`/`totalQuestions`.
3. `processQuizAttempt` API response has no `correctCount`/`totalQuestions`.
4. `QuizPlayer` type declares them as optional (`correctCount?: number`) so TypeScript doesn't catch the missing field.

## Fix

### Layer 1 — `completeQuizAttempt` (QuizAttempt.ts)

Change the return type to include `correctCount` and `totalQuestions`:

```typescript
// Before
return Result.ok({
  ...params.attempt,
  status: "completed",
  score,
  passed,
  completedAt: new Date(),
});

// After
return Result.ok({
  attempt: {
    ...params.attempt,
    status: "completed",
    score,
    passed,
    completedAt: new Date(),
  },
  correctCount,
  totalQuestions,
});
```

### Layer 2 — `RecordQuizAttempt` use case (RecordQuizAttempt.ts)

Update `RecordQuizAttemptResult` to include the new fields. Extract them from the `completeQuizAttempt` result:

```typescript
export type RecordQuizAttemptResult = Result<
  {
    attempt: QuizAttempt;
    score: number | null;
    passed: boolean | null;
    xpAwarded: number;
    correctCount: number | null; // NEW
    totalQuestions: number | null; // NEW
  },
  RecordQuizAttemptError
>;
```

In `execute()`, after `completeQuizAttempt` succeeds:

```typescript
correct = completed.value; // now { attempt, correctCount, totalQuestions }
attempt = correct.attempt;
score = attempt.score;
passed = attempt.passed;
const correctCount = correct.correctCount; // NEW
const totalQuestions = correct.totalQuestions; // NEW

// In the return:
return Result.ok({ attempt, score, passed, xpAwarded, correctCount, totalQuestions });
```

When `allAnswered` is false (in-progress attempt), `correctCount = null` and `totalQuestions = null`.

### Layer 3 — `processQuizAttempt` (processQuizAttempt.ts)

Update the `value` shape in `ProcessQuizAttemptResult`:

```typescript
value: {
  attempt: QuizAttempt;
  score: number | null;
  passed: boolean | null;
  xpAwarded: number;
  correctCount: number | null; // NEW
  totalQuestions: number | null; // NEW
}
```

In the return:

```typescript
return {
  ok: true,
  status: 200,
  value: {
    ...result.value,
    correctCount: result.value.correctCount,
    totalQuestions: result.value.totalQuestions,
  },
};
```

## Tests to update

### `QuizAttempt.test.ts` (domain entity tests)

- `completeQuizAttempt` — add assertions for `correctCount` and `totalQuestions` in the success case

### `RecordQuizAttempt.test.ts` (use case tests)

- `all questions answered — passing`: assert `correctCount` and `totalQuestions`
- `all questions answered — failing`: assert `correctCount = 1, totalQuestions = 2` for the failing case
- `some questions unanswered`: assert `correctCount = null, totalQuestions = null`

### `processQuizAttempt.test.ts` (API handler tests)

- Happy path: assert `correctCount = 3, totalQuestions = 3`
- Partial: assert `correctCount = null, totalQuestions = null`
- Failing score: assert `correctCount = 1, totalQuestions = 3` (1 of 3 correct)

## Acceptance Criteria

- [x] `completeQuizAttempt` returns `correctCount` and `totalQuestions`
- [x] `RecordQuizAttempt` result includes `correctCount` and `totalQuestions`
- [x] API response includes `correctCount` and `totalQuestions`
- [x] `QuizPlayer` result screen shows "X of Y correct" with real numbers
- [x] All three test suites updated and passing
- [x] `pnpm typecheck && pnpm lint && pnpm test` green
- [ ] PR opened against `main`

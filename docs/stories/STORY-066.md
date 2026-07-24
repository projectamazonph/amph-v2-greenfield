# STORY-066: Feedback Composer + Remediation Recommendations

**Date:** 2026-07-24
**Owner:** Ryan Dabao
**Status:** Ready

## Context

STORY-065 introduced the scoring engine: a graded SimulatorAttempt carries a weighted overall score (0-100) and per-dimension raw scores. STORY-066 adds the feedback layer: for every graded attempt, the system composes actionable per-dimension feedback and overall remediation guidance.

The feedback composer is a **pure domain function**. All inputs are already present in the graded attempt. No external calls needed.

## Design

### Domain Entity: AttemptFeedback

Located at `src/domain/entities/AttemptFeedback.ts`.

```typescript
export type FeedbackVerdict = "excellent" | "good" | "fair" | "poor";

export interface DimensionFeedback {
  readonly dimension: string;
  readonly verdict: FeedbackVerdict;
  readonly score: number;
  readonly comment: string;
  readonly recommendation: string;
}

export interface AttemptFeedback {
  readonly attemptId: string;
  readonly userId: string;
  readonly simulatorId: SimulatorId;
  readonly scenarioId: string;
  readonly difficulty: Difficulty;
  readonly mode: SimulatorMode;
  readonly overallScore: number;
  readonly passed: boolean;
  readonly overallComment: string;
  readonly remediationLinks: readonly string[];
  readonly dimensionFeedback: readonly DimensionFeedback[];
  readonly completedAt: Date;
}
```

### Verdict Thresholds

| Score range | Verdict   |
| ----------- | --------- |
| 90-100      | excellent |
| 70-89       | good      |
| 50-69       | fair      |
| 0-49        | poor      |

### Remediation Links

If passed: show a next scenario or try challenge mode link.
If failed: show relevant learning module links per weak dimension.

### Factory Function

`composeAttemptFeedback(attempt, policy): AttemptFeedback`

Pure function - no side effects, no external calls. Returns AttemptFeedback.

### Port: IAttemptFeedbackRepository

```typescript
export interface IAttemptFeedbackRepository {
  create(feedback: AttemptFeedback): Promise<Result<void, AttemptFeedbackError>>;
  findByAttemptId(attemptId: string): Promise<Result<AttemptFeedback | null, AttemptFeedbackError>>;
  findByUserId(
    userId: string,
    limit?: number,
  ): Promise<Result<readonly AttemptFeedback[], AttemptFeedbackError>>;
}

export type AttemptFeedbackError = { kind: "db_error"; message: string };
```

### Infra Adapters

- `InMemoryAttemptFeedbackRepository` - in-memory Map<string, AttemptFeedback>
- `PrismaAttemptFeedbackRepository` - persists AttemptFeedback as JSON in a dedicated table

### Prisma Schema Addition

```prisma
model AttemptFeedback {
  id               String   @id @default(cuid())
  attemptId        String   @unique
  userId           String
  simulatorId      String
  scenarioId       String
  difficulty       String
  mode             String
  overallScore     Int
  passed           Boolean
  overallComment   String
  remediationLinks Json
  dimensionFeedback Json
  completedAt      DateTime @default(now())

  @@index([userId])
  @@map("attempt_feedbacks")
}
```

### Use Case: ComposeAttemptFeedback

**Input:** `{ attemptId: string }`

**Steps:**

1. Load attempt via attemptRepo.findById(attemptId) - fail if not found
2. Assert attempt.status === "graded" - fail if not graded
3. Load ScorePolicy via scorePolicyRepo.findBySimulatorAndMode(...) - fail if not found
4. Call composeAttemptFeedback(attempt, policy) - pure domain function
5. Persist feedback via feedbackRepo.create(feedback)
6. Return { feedback }

**Error cases:** attempt_not_found, attempt_not_graded, policy_not_found, db_error

### Server Action

Uses requireAuth() middleware guard. Returns serialized AttemptFeedback.

## Code Shape

| File                                                                         | Change                    |
| ---------------------------------------------------------------------------- | ------------------------- |
| `src/domain/entities/AttemptFeedback.ts`                                     | new - entity + factory    |
| `src/ports/repositories/IAttemptFeedbackRepository.ts`                       | new - port                |
| `src/infra/repositories/InMemoryAttemptFeedbackRepository.ts`                | new - adapter             |
| `src/infra/repositories/PrismaAttemptFeedbackRepository.ts`                  | new - adapter             |
| `src/infra/repositories/__tests__/InMemoryAttemptFeedbackRepository.test.ts` | new - tests               |
| `src/usecases/ComposeAttemptFeedback.ts`                                     | new - use case            |
| `src/app/actions/composeAttemptFeedback.action.ts`                           | new - server action       |
| `tests/unit/domain/entities/AttemptFeedback.test.ts`                         | new - 18+ tests           |
| `tests/unit/usecases/ComposeAttemptFeedback.test.ts`                         | new - 8 tests             |
| `prisma/schema.prisma`                                                       | add AttemptFeedback model |
| `src/composition/container.ts`                                               | wire new repo + use case  |
| `src/composition/container.test.ts`                                          | wire in test container    |

## Tests

### AttemptFeedback Domain (18 tests)

1. composeAttemptFeedback generates feedback for a passing attempt
2. composeAttemptFeedback generates feedback for a failing attempt
3. All four verdicts assigned correctly based on score thresholds
4. Passed === true when score >= policy.passingScore
5. Passed === false when score < policy.passingScore
6. Overall comment references the simulator name
7. RemediationLinks contains next scenario when passed
8. RemediationLinks is empty when not passed
9. dimensionFeedback array matches keys in scoreDimensions
10. Each DimensionFeedback has correct verdict per score
11. Each DimensionFeedback has non-empty comment
12. Each DimensionFeedback has non-empty recommendation
13. Missing dimensions omitted from dimensionFeedback
14. Empty decisions array handled gracefully
15. composeAttemptFeedback with intermediate difficulty
16. composeAttemptFeedback with advanced difficulty
17. composeAttemptFeedback with credential mode
18. Hydration round-trip preserves all fields

### ComposeAttemptFeedback Use Case (8 tests)

1. Happy path: loads attempt, finds policy, composes, persists
2. attempt_not_found returned when attempt does not exist
3. attempt_not_graded returned when attempt status !== "graded"
4. policy_not_found returned when no matching ScorePolicy
5. db_error returned when repository write fails
6. Feedback is findable by attemptId after compose
7. Feedback is findable by userId after compose
8. Multiple attempts per user each get their own feedback

### InMemoryAttemptFeedbackRepository (6 tests)

1. create and findByAttemptId happy path
2. findByAttemptId returns null for missing id
3. findByUserId returns all feedback for a user
4. findByUserId with limit returns correct count
5. findByUserId returns empty array for user with no feedback
6. create fails if attemptId already exists (unique constraint)

## Definition of Done

- [x] Code: all listed files created/modified
- [x] Tests: unit tests for domain, use case, and adapter
- [x] Lint: pnpm lint passes
- [x] Typecheck: pnpm typecheck passes
- [x] pnpm prisma:generate succeeds with new AttemptFeedback model
- [x] Conventional commit: feat(simulator): STORY-066 feedback composer + remediation
- [x] PR opened against main, CI green

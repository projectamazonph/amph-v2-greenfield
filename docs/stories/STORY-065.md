# STORY-065: Scoring Engine + Dimensional Policies

## Context

STORY-064 delivered the attempt infrastructure: SimulatorAttempt entity, ISimulatorAttemptRepository, InMemorySimulatorAttemptRepository, PrismaSimulatorAttemptRepository, StartSimulatorAttempt, SaveSimulatorDecision, and SubmitSimulatorAttempt. The state machine supports in_progress to submitted to graded transitions, but the actual scoring step is not yet implemented.

STORY-065 fills that gap. It introduces the scoring engine -- a domain service that evaluates a submitted attempt against a per-simulator, per-difficulty, per-mode ScorePolicy, computes per-dimension scores, combines them into an overall score, and persists the result to the attempt.

This story does NOT implement the per-dimension grading logic inside each simulator. That is future work (STORY-066 covers feedback composition). STORY-065's scope ends at: attempt is submitted -> attempt is graded with a computed overall score and a ScoreDimensions map.

## Scope

### In scope

- ScorePolicy domain entity
- IScorePolicyRepository port
- PrismaScorePolicyRepository and InMemoryScorePolicyRepository adapters
- GradeSimulatorAttempt use case
- gradeSimulatorAttempt server action
- ScorePolicy Prisma model
- Container wiring (production + test)
- Unit tests

### Out of scope

- Per-dimension grading algorithms inside each simulator (deferred to STORY-066)
- Feedback text or remediation recommendations
- Leaderboard / rank computation
- Changing a simulator's run() output shape

## Domain Model

### ScorePolicy Entity

A ScorePolicy describes how to grade a simulator for a specific difficulty and mode. It lives in the domain layer and is a plain data object (factory + domain functions, no side effects).

dimensionConfig: Record<string, DimensionConfig> -- key is dimension name, value is { weight: 0.0-1.0, passingThreshold: 0-100 }
passingScore: number -- minimum overall score (0-100) to pass. Default: 70.

Factory: createScorePolicy(params) -- validates weight sum = 1.0 (±0.001), all dimensions known GradingDimension, passingScore 0-100.

Domain functions:

- getOverallScore(scoreDimensions, policy) -- weighted average of dimension scores, capped 0-100
- isPassed(overallScore, policy) -- overallScore >= policy.passingScore
- isValidPolicy(policy) -- checks weight sum + all dimensions known + passingScore 0-100
- getWeightForDimension(policy, dimension) -- returns weight or 0
- hydrateScorePolicy(plain) -- reconstructs from persisted data

## Use Case: GradeSimulatorAttempt

Input: { attemptId: string, scoreDimensions: Record<string, number> }

Steps:

1. Load attempt by attemptId. Return attempt_not_found if null.
2. Assert attempt.status is submitted. Return attempt_not_submitted or attempt_already_graded as appropriate.
3. Find ScorePolicy matching (simulatorId, difficulty, mode). Return policy_not_found if none.
4. Validate all dimension keys in input.scoreDimensions are configured in the policy. Return invalid_dimensions with the list of unknown keys if not.
5. Compute overallScore = getOverallScore(input.scoreDimensions, policy).
6. Call attemptRepo.updateStatus(attempt.id, graded, { score, scoreDimensions }).
7. Return { attemptId, overallScore, scoreDimensions, isPassed, gradedAt }.

## Repository: IScorePolicyRepository

Methods:

- findBySimulatorAndDifficulty(simulatorId, difficulty, mode) -- returns ScorePolicy | null
- findBySimulator(simulatorId) -- returns readonly ScorePolicy[]
- create(policy) -- fails if policy already exists for the same tuple
- update(policy) -- updates an existing policy

## Prisma Model

model ScorePolicy {
id String @id @default(cuid())
simulatorId String
difficulty String
mode String
dimensionConfig Json // Record<string, { weight: number; passingThreshold: number }>
passingScore Int @default(70)
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

@@unique([simulatorId, difficulty, mode])
@@index([simulatorId])
@@map("score_policies")
}

## File Inventory

| File                                                                   | Action                           |
| ---------------------------------------------------------------------- | -------------------------------- |
| src/domain/entities/ScorePolicy.ts                                     | Create                           |
| src/ports/repositories/IScorePolicyRepository.ts                       | Create                           |
| src/infra/repositories/InMemoryScorePolicyRepository.ts                | Create                           |
| src/infra/repositories/PrismaScorePolicyRepository.ts                  | Create                           |
| src/usecases/GradeSimulatorAttempt.ts                                  | Create                           |
| src/app/actions/gradeSimulatorAttempt.action.ts                        | Create                           |
| src/infra/repositories/**tests**/InMemoryScorePolicyRepository.test.ts | Create                           |
| tests/unit/domain/entities/ScorePolicy.test.ts                         | Create                           |
| tests/unit/usecases/GradeSimulatorAttempt.test.ts                      | Create                           |
| src/composition/container.ts                                           | Edit -- add wiring               |
| src/composition/container.test.ts                                      | Edit -- add test container entry |
| prisma/schema.prisma                                                   | Edit -- add ScorePolicy model    |

## Acceptance Criteria

- [ ] GradeSimulatorAttempt transitions a submitted attempt to graded with the correct score persisted
- [ ] Attempting to grade an in_progress, graded, or expired attempt returns the correct error
- [ ] Missing a ScorePolicy returns policy_not_found
- [ ] getOverallScore correctly weighted-averages dimension scores
- [ ] isPassed returns true when overall score >= policy.passingScore
- [ ] InMemoryScorePolicyRepository passes all CRUD tests
- [ ] PrismaScorePolicyRepository passes all CRUD tests
- [ ] pnpm typecheck -- 0 errors
- [ ] pnpm lint -- 0 errors
- [ ] pnpm test -- all new tests pass

## Definition of Done

1. All acceptance criteria above green
2. PR opened and CI green
3. Merged into main

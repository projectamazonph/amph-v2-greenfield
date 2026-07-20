# STORY-032 — RecordQuizAttempt Use Case

## Status

- **Story**: STORY-032
- **Sprint**: 7 — Quizzes + Gamification
- **Points**: 2
**Status:** ✅ Done (PR #32, commit `6321d5e` — `feat(story-032): RecordQuizAttempt use case`)

## Overview

`RecordQuizAttempt` use case — orchestrates the full quiz-taking flow:
1. Start a quiz attempt
2. Answer questions (students can change answers)
3. Complete and score the attempt

Also awards XP when passed (`quiz_passed`), fire-and-forget.

## 1. Use Case Interface

```typescript
// src/usecases/RecordQuizAttempt.ts

export type RecordQuizAttemptInput = {
  userId: string;
  quizId: string;
  answers: Array<{ questionId: string; selectedOptionId: string }>;
};

export type RecordQuizAttemptDeps = {
  quizRepo: IQuizRepository;
  quizAttemptRepo: IQuizAttemptRepository;
  xpEventRepo: IXPEventRepository;
  userRepo: UserRepository;
  idGen: IdGenerator;
  clock: Clock;
};

export type RecordQuizAttemptError =
  | { kind: "quiz_not_found" }
  | { kind: "invalid_answer"; questionId: string; reason: string }
  | { kind: "attempt_error"; message: string };

export type RecordQuizAttemptResult = Result<
  {
    attempt: QuizAttempt;
    score: number;
    passed: boolean;
    xpAwarded: number; // 0 if failed
  },
  RecordQuizAttemptError
>;

export class RecordQuizAttempt {
  constructor(private readonly deps: RecordQuizAttemptDeps) {}

  async execute(input: RecordQuizAttemptInput): Promise<RecordQuizAttemptResult>;
}
```

## 2. Rules

1. Quiz must exist → `quiz_not_found`
2. `userId`, `quizId` must be non-empty
3. Each answer must reference a valid questionId and optionId in the quiz → `invalid_answer`
4. If a question is answered multiple times, last answer wins (correction allowed)
5. Attempt completes automatically with scoring when all questions answered
6. If all questions are answered → score and persist the completed attempt
7. If any question is unanswered → return the in-progress attempt without error (student can retry)
8. If `passed=true` → award XP (fire-and-forget, amount TBD by XPService, e.g. 20 XP for quiz passed)

## 3. Algorithm

```
1. Fetch quiz by quizId → err if not found
2. Validate all answers (questionId + optionId in quiz)
3. Start attempt (idGen.newId(), userId, quizId)
4. For each answer → answerQuestion(attempt, ...)
5. Check: are all quiz questions answered?
   - YES: completeQuizAttempt(attempt, quiz) → score + passed
           persist via quizAttemptRepo.update()
           if passed: award XP (fire-and-forget)
   - NO:  persist in-progress attempt via quizAttemptRepo.create()
6. Return attempt + score + passed + xpAwarded
```

## 4. XP Rules

XP awarded on passing (fire-and-forget):
- `quiz_passed` reason
- Amount: `XPService.QUIZ_PASSED_XP` (e.g. 20 XP)

## 5. Tests

### Unit tests (`src/usecases/__tests__/RecordQuizAttempt.test.ts`)

Using `InMemoryQuizRepository` + `InMemoryQuizAttemptRepository`.

Fixtures: `makeQuiz()` from Quiz entity tests, `buildUseCase(deps)`.

1. **Quiz not found** → err `quiz_not_found`
2. **Valid answers, all correct → passed=true, score=100, XP awarded**
3. **Valid answers, 1 wrong → passed=false (passingScore=70), score=50, no XP**
4. **Some questions unanswered → in_progress attempt persisted, no score**
5. **Duplicate answers for same question → last one wins**
6. **Invalid questionId → err `invalid_answer`**
7. **Invalid optionId → err `invalid_answer`**
8. **XP award failure is silent** (fire-and-forget)

## Acceptance Criteria

- [ ] Quiz not found → `quiz_not_found` error
- [ ] Invalid answer → `invalid_answer` with questionId and reason
- [ ] All answered → completed attempt with score, passed, persisted
- [ ] Some unanswered → in-progress attempt persisted
- [ ] Passed → XP awarded fire-and-forget
- [ ] All 8 test cases pass

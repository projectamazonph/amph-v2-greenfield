# STORY-031 — Quiz + QuizAttempt Models + Repositories

## Status

- **Story**: STORY-031
- **Sprint**: 7 — Quizzes + Gamification
- **Points**: 2
- **Status**: In Progress

## Overview

Quiz entity and QuizAttempt entity (student quiz attempts) with full CRUD repositories:
- `Quiz` — a quiz tied to a course, with questions and options
- `QuizAttempt` — a student's attempt at a quiz, with scoring and pass/fail

## 1. Domain Entities

### Quiz

```typescript
// QuizOption: one answer choice
export interface QuizOption {
  readonly id: string;
  readonly optionText: string;
  readonly isCorrect: boolean;
}

// QuizQuestion: one question with multiple choices
export interface QuizQuestion {
  readonly id: string;
  readonly questionText: string;
  readonly options: readonly QuizOption[];
}

// Quiz: a course quiz
export interface Quiz {
  readonly id: string;
  readonly courseId: string;
  readonly title: string;
  readonly passingScore: number; // 0-100
  readonly questions: readonly QuizQuestion[];
}

export type CreateQuizError =
  | { kind: "invalid_id" }
  | { kind: "invalid_course_id" }
  | { kind: "invalid_title" }
  | { kind: "invalid_passing_score" }
  | { kind: "no_questions" }
  | { kind: "question_missing_correct_option" }
  | { kind: "question_multiple_correct_options" };

export function createQuiz(params: {
  id: string;
  courseId: string;
  title: string;
  passingScore: number;
  questions: CreateQuizParams_Question[];
}): Result<Quiz, CreateQuizError>;
```

### QuizAttempt

```typescript
// QuizAttemptAnswer: one answered question
export interface QuizAttemptAnswer {
  readonly questionId: string;
  readonly selectedOptionId: string;
}

// QuizAttempt: a student's attempt
export interface QuizAttempt {
  readonly id: string;
  readonly userId: string;
  readonly quizId: string;
  readonly status: "in_progress" | "completed";
  readonly answers: readonly QuizAttemptAnswer[];
  readonly score: number | null;   // null when in_progress
  readonly passed: boolean | null;  // null when in_progress
  readonly startedAt: Date;
  readonly completedAt: Date | null;
}

export type StartQuizAttemptError =
  | { kind: "invalid_id" }
  | { kind: "invalid_user_id" }
  | { kind: "invalid_quiz_id" };

export type AnswerQuestionError =
  | { kind: "attempt_not_in_progress" }
  | { kind: "already_completed" }
  | { kind: "invalid_question_id" }
  | { kind: "invalid_option_id" }
  | { kind: "duplicate_answer" };

export type CompleteQuizAttemptError =
  | { kind: "attempt_not_in_progress" }
  | { kind: "not_all_questions_answered"; unanswered: string[] };

// startQuizAttempt(params): Result<QuizAttempt, StartQuizAttemptError>
// answerQuestion(attempt, questionId, selectedOptionId): Result<QuizAttempt, AnswerQuestionError>
// completeQuizAttempt(attempt, correctAnswers: Map<questionId, optionId>): Result<QuizAttempt, CompleteQuizAttemptError>
```

### Scoring Rules

- Score = `(correct answers / total questions) * 100`, rounded to nearest integer
- `passed = score >= quiz.passingScore`
- Attempt cannot be completed unless all questions are answered

## 2. Repository Ports

### IQuizRepository

```typescript
export interface IQuizRepository {
  create(quiz: Quiz): Promise<Result<Quiz, QuizRepositoryError>>;
  findById(id: string): Promise<Result<Quiz | null, QuizRepositoryError>>;
  findByCourseId(courseId: string): Promise<Result<readonly Quiz[], QuizRepositoryError>>;
}
```

### IQuizAttemptRepository

```typescript
export interface IQuizAttemptRepository {
  create(attempt: QuizAttempt): Promise<Result<QuizAttempt, QuizAttemptRepositoryError>>;
  update(attempt: QuizAttempt): Promise<Result<QuizAttempt, QuizAttemptRepositoryError>>;
  findById(id: string): Promise<Result<QuizAttempt | null, QuizAttemptRepositoryError>>;
  findByUserAndQuiz(userId: string, quizId: string): Promise<Result<readonly QuizAttempt[], QuizAttemptRepositoryError>>;
  findLatestByUserAndQuiz(userId: string, quizId: string): Promise<Result<QuizAttempt | null, QuizAttemptRepositoryError>>;
}
```

## 3. Infrastructure Adapters

- `InMemoryQuizRepository` — in-memory store, clear/seed helpers
- `InMemoryQuizAttemptRepository` — in-memory store, clear/seed helpers
- `PrismaQuizRepository` — production Prisma adapter
- `PrismaQuizAttemptRepository` — production Prisma adapter

## 4. Prisma Schema

```prisma
model Quiz {
  id            String   @id @default(cuid())
  courseId      String
  title         String
  passingScore  Int      @default(70) // 0-100
  questions     QuizQuestion[]
  createdAt     DateTime @default(now())

  @@map("quizzes")
}

model QuizQuestion {
  id         String       @id @default(cuid())
  quizId     String
  quiz       Quiz         @relation(fields: [quizId], references: [id], onDelete: Cascade)
  questionText String
  options    QuizOption[]
  order      Int          @default(0)

  @@map("quiz_questions")
}

model QuizOption {
  id           String        @id @default(cuid())
  questionId   String
  question     QuizQuestion  @relation(fields: [questionId], references: [id], onDelete: Cascade)
  optionText   String
  isCorrect    Boolean       @default(false)
  order        Int           @default(0)

  @@map("quiz_options")
}

model QuizAttempt {
  id          String    @id @default(cuid())
  userId      String
  quizId      String
  status      String    @default("in_progress") // in_progress | completed
  score       Int?
  passed      Boolean?
  startedAt   DateTime  @default(now())
  completedAt DateTime?
  answers     QuizAttemptAnswer[]

  @@index([userId, quizId])
  @@index([quizId])
  @@map("quiz_attempts")
}

model QuizAttemptAnswer {
  id               String      @id @default(cuid())
  attemptId        String
  attempt          QuizAttempt @relation(fields: [attemptId], references: [id], onDelete: Cascade)
  questionId       String
  selectedOptionId String

  @@unique([attemptId, questionId])
  @@map("quiz_attempt_answers")
}
```

## 5. Tests

### Unit Tests

- `Quiz.test.ts`: createQuiz — valid quiz, fail-fast on bad params
- `QuizAttempt.test.ts`: start/answer/complete — scoring, pass/fail logic
- `InMemoryQuizRepository.test.ts`: create + findById + findByCourseId
- `InMemoryQuizAttemptRepository.test.ts`: create + update + findLatestByUserAndQuiz

### Test Helpers

```typescript
function makeQuizWithQuestions(): Quiz { ... }
function makeAttemptWithAnswers(): QuizAttempt { ... }
```

## Acceptance Criteria

- [ ] `createQuiz` enforces: id/courseId/title non-empty, passingScore 0-100, ≥1 question, exactly 1 correct option per question
- [ ] `startQuizAttempt` creates attempt with status=in_progress
- [ ] `answerQuestion` adds/replaces answer, fails if already completed
- [ ] `completeQuizAttempt` scores correctly, sets passed, fails if questions unanswered
- [ ] All four repository implementations work correctly
- [ ] All tests pass (16+ existing + new)

/**
 * RecordQuizAttempt — student takes a quiz and gets scored.
 *
 * STORY-032: RecordQuizAttempt use case.
 *
 * Orchestrates the full quiz-taking flow:
 * 1. Fetch quiz → quiz_not_found
 * 2. Validate all answers (questionId + optionId)
 * 3. Start attempt, answer all questions
 * 4. If all questions answered → complete + score + award XP (fire-and-forget)
 * 5. If some unanswered → persist in-progress attempt
 * 6. Return attempt + score + passed + xpAwarded
 */

import { Result } from "@/domain/shared/Result";
import { quizQuestionCount } from "@/domain/entities/Quiz";
import type { Quiz } from "@/domain/entities/Quiz";
import {
  startQuizAttempt,
  answerQuestion,
  completeQuizAttempt,
} from "@/domain/entities/QuizAttempt";
import type { QuizAttempt } from "@/domain/entities/QuizAttempt";
import { XPService } from "@/domain/services/XPService";
import { AwardXP } from "@/usecases/AwardXP";
import type { IQuizRepository } from "@/ports/repositories/IQuizRepository";
import type { IQuizAttemptRepository } from "@/ports/repositories/IQuizAttemptRepository";
import type { IXPEventRepository } from "@/ports/repositories/IXPEventRepository";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import type { IdGenerator } from "@/ports/system/IdGenerator";
import type { Clock } from "@/ports/system/Clock";
import type {
  StartQuizAttemptError,
  AnswerQuestionError,
  CompleteQuizAttemptError,
} from "@/domain/entities/QuizAttempt";
import type { QuizAttemptRepositoryError } from "@/ports/repositories/IQuizAttemptRepository";

// ── Input / Output types ───────────────────────────────────────────────────

export type RecordQuizAttemptInput = {
  userId: string;
  quizId: string;
  answers: ReadonlyArray<{ questionId: string; selectedOptionId: string }>;
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
  | StartQuizAttemptError
  | AnswerQuestionError
  | CompleteQuizAttemptError
  | QuizAttemptRepositoryError;

export type RecordQuizAttemptResult = Result<
  {
    attempt: QuizAttempt;
    score: number | null;
    passed: boolean | null;
    xpAwarded: number;
  },
  RecordQuizAttemptError
>;

// ── Use Case ────────────────────────────────────────────────────────────────

export class RecordQuizAttempt {
  constructor(private readonly deps: RecordQuizAttemptDeps) {}

  async execute(input: RecordQuizAttemptInput): Promise<RecordQuizAttemptResult> {
    const { quizRepo, quizAttemptRepo, xpEventRepo, userRepo, idGen, clock } = this.deps;

    // ── 1. Fetch quiz ───────────────────────────────────────────────────
    const quizResult = await quizRepo.findById(input.quizId);
    if (!quizResult.ok) {
      return Result.err({ kind: "quiz_not_found" });
    }
    const quiz = quizResult.value;
    if (!quiz) {
      return Result.err({ kind: "quiz_not_found" });
    }

    // ── 2. Validate all answers ─────────────────────────────────────────
    const questionIds = quiz.questions.map((q) => q.id);
    const optionIds = quiz.questions.flatMap((q) => q.options.map((o) => o.id));

    for (const answer of input.answers) {
      if (!questionIds.includes(answer.questionId)) {
        return Result.err({ kind: "invalid_answer", questionId: answer.questionId, reason: "question not found" });
      }
      if (!optionIds.includes(answer.selectedOptionId)) {
        return Result.err({ kind: "invalid_answer", questionId: answer.questionId, reason: "option not found" });
      }
    }

    // ── 3. Start attempt ─────────────────────────────────────────────────
    const attemptResult = startQuizAttempt({
      id: idGen.newId(),
      userId: input.userId,
      quizId: input.quizId,
    });
    if (!attemptResult.ok) return attemptResult;

    let attempt = attemptResult.value;

    // ── 4. Answer all questions ──────────────────────────────────────────
    for (const answer of input.answers) {
      const answered = answerQuestion({
        attempt,
        questionId: answer.questionId,
        selectedOptionId: answer.selectedOptionId,
        quizQuestionIds: questionIds,
        quizOptionIds: optionIds,
      });
      if (!answered.ok) return answered;
      attempt = answered.value;
    }

    // ── 5. Check if all questions answered ──────────────────────────────
    const totalQuestions = quizQuestionCount(quiz);
    const allAnswered = attempt.answers.length === totalQuestions;
    let score: number | null = null;
    let passed: boolean | null = null;
    let xpAwarded = 0;

    if (allAnswered) {
      // ── 5a. Complete and score ─────────────────────────────────────
      const completed = completeQuizAttempt({ attempt, quiz });
      if (!completed.ok) return completed;
      attempt = completed.value;
      score = attempt.score;
      passed = attempt.passed;

      // ── 5b. Award XP if passed (fire-and-forget) ────────────────────
      if (attempt.passed) {
        xpAwarded = XPService.QUIZ_PASSED_XP;
        this.awardXpFireAndForget({
          userId: input.userId,
          amount: xpAwarded,
          refId: attempt.id,
        });
      }
    }

    // ── 6. Persist ───────────────────────────────────────────────────────
    // P0-6 fix: RecordQuizAttempt ALWAYS creates a fresh attempt
    // (startQuizAttempt generates a new id). It is never an update.
    // The previous code called `update` for completed attempts,
    // which worked against the in-memory fake (which upserted) but
    // failed against Prisma (which requires the row to exist).
    const createResult = await quizAttemptRepo.create(attempt);
    if (!createResult.ok) return createResult;
    attempt = createResult.value;

    return Result.ok({ attempt, score, passed, xpAwarded });
  }

  private awardXpFireAndForget(params: {
    userId: string;
    amount: number;
    refId: string;
  }): void {
    const awardXp = new AwardXP({
      xpEventRepo: this.deps.xpEventRepo,
      userRepo: this.deps.userRepo,
      idGen: this.deps.idGen,
      clock: this.deps.clock,
    });
    awardXp.execute({
      userId: params.userId,
      amount: params.amount,
      reason: "quiz_passed",
      refId: params.refId,
    }).catch((err: unknown) => {
      console.error("[RecordQuizAttempt] Failed to award quiz XP:", err);
    });
  }
}

/**
 * QuizAttempt — a student's attempt at a quiz.
 *
 * STORY-031: Quiz + QuizAttempt models + repositories.
 */

import { Result } from "@/domain/shared/Result";
import type { Quiz } from "./Quiz";
import { quizCorrectAnswers } from "./Quiz";

// ── Types ───────────────────────────────────────────────────────────────────

export interface QuizAttemptAnswer {
  readonly questionId: string;
  readonly selectedOptionId: string;
}

export interface QuizAttempt {
  readonly id: string;
  readonly userId: string;
  readonly quizId: string;
  readonly status: "in_progress" | "completed";
  readonly answers: readonly QuizAttemptAnswer[];
  readonly score: number | null;
  readonly passed: boolean | null;
  readonly startedAt: Date;
  readonly completedAt: Date | null;
}

// ── Error Types ─────────────────────────────────────────────────────────────

export type StartQuizAttemptError =
  | { kind: "invalid_id" }
  | { kind: "invalid_user_id" }
  | { kind: "invalid_quiz_id" };

export type AnswerQuestionError =
  | { kind: "attempt_not_in_progress" }
  | { kind: "already_completed" }
  | { kind: "invalid_question_id"; quizQuestionIds: readonly string[] }
  | { kind: "invalid_option_id"; questionId: string };

export type CompleteQuizAttemptError =
  | { kind: "attempt_not_in_progress" }
  | { kind: "not_all_questions_answered"; unanswered: readonly string[] };

// ── Start Attempt ───────────────────────────────────────────────────────────

export function startQuizAttempt(params: {
  id: string;
  userId: string;
  quizId: string;
}): Result<QuizAttempt, StartQuizAttemptError> {
  if (!params.id.trim()) return Result.err({ kind: "invalid_id" });
  if (!params.userId.trim()) return Result.err({ kind: "invalid_user_id" });
  if (!params.quizId.trim()) return Result.err({ kind: "invalid_quiz_id" });

  const attempt: QuizAttempt = {
    id: params.id,
    userId: params.userId,
    quizId: params.quizId,
    status: "in_progress",
    answers: [],
    score: null,
    passed: null,
    startedAt: new Date(),
    completedAt: null,
  };

  return Result.ok(attempt);
}

// ── Answer Question ─────────────────────────────────────────────────────────

export function answerQuestion(params: {
  attempt: QuizAttempt;
  questionId: string;
  selectedOptionId: string;
  quizQuestionIds: readonly string[];
  quizOptionIds: readonly string[];
}): Result<QuizAttempt, AnswerQuestionError> {
  if (params.attempt.status === "completed") {
    return Result.err({ kind: "already_completed" });
  }

  if (!params.quizQuestionIds.includes(params.questionId)) {
    return Result.err({ kind: "invalid_question_id", quizQuestionIds: params.quizQuestionIds });
  }

  if (!params.quizOptionIds.includes(params.selectedOptionId)) {
    return Result.err({ kind: "invalid_option_id", questionId: params.questionId });
  }

  // Replace any previous answer for this question
  const without = params.attempt.answers.filter(
    (a) => a.questionId !== params.questionId,
  );

  return Result.ok({
    ...params.attempt,
    answers: [
      ...without,
      { questionId: params.questionId, selectedOptionId: params.selectedOptionId },
    ],
  });
}

// ── Complete Attempt ────────────────────────────────────────────────────────

export function completeQuizAttempt(params: {
  attempt: QuizAttempt;
  quiz: Quiz;
}): Result<QuizAttempt, CompleteQuizAttemptError> {
  if (params.attempt.status === "completed") {
    return Result.err({ kind: "attempt_not_in_progress" });
  }

  const correctAnswers = quizCorrectAnswers(params.quiz);
  const unanswered: string[] = [];

  for (const questionId of correctAnswers.keys()) {
    const answered = params.attempt.answers.some((a) => a.questionId === questionId);
    if (!answered) unanswered.push(questionId);
  }

  if (unanswered.length > 0) {
    return Result.err({ kind: "not_all_questions_answered", unanswered });
  }

  let correctCount = 0;
  for (const answer of params.attempt.answers) {
    const correctOptionId = correctAnswers.get(answer.questionId);
    if (correctOptionId === answer.selectedOptionId) correctCount++;
  }

  const totalQuestions = correctAnswers.size;
  const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const passed = score >= params.quiz.passingScore;

  return Result.ok({
    ...params.attempt,
    status: "completed",
    score,
    passed,
    completedAt: new Date(),
  });
}

// ── Query helpers ───────────────────────────────────────────────────────────

export function attemptAllAnswered(attempt: QuizAttempt, questionCount: number): boolean {
  return attempt.answers.length === questionCount;
}

export function attemptAnsweredCount(attempt: QuizAttempt): number {
  return attempt.answers.length;
}

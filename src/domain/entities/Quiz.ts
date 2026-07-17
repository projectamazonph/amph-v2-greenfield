/**
 * Quiz — a course quiz with questions and options.
 *
 * STORY-031: Quiz + QuizAttempt models + repositories.
 */

import { Result } from "@/domain/shared/Result";

// ── Types ───────────────────────────────────────────────────────────────────

export interface QuizOption {
  readonly id: string;
  readonly optionText: string;
  readonly isCorrect: boolean;
}

export interface QuizQuestion {
  readonly id: string;
  readonly questionText: string;
  readonly options: readonly QuizOption[];
}

export interface Quiz {
  readonly id: string;
  readonly courseId: string;
  readonly title: string;
  readonly passingScore: number; // 0-100
  readonly questions: readonly QuizQuestion[];
}

// ── Error Types ─────────────────────────────────────────────────────────────

export type CreateQuizError =
  | { kind: "invalid_id" }
  | { kind: "invalid_course_id" }
  | { kind: "invalid_title" }
  | { kind: "invalid_passing_score" }
  | { kind: "no_questions" }
  | { kind: "question_missing_correct_option" }
  | { kind: "question_multiple_correct_options" };

// ── Params ─────────────────────────────────────────────────────────────────

export type CreateQuizQuestionParams = {
  id: string;
  questionText: string;
  options: { id: string; optionText: string; isCorrect: boolean }[];
};

export type CreateQuizParams = {
  id: string;
  courseId: string;
  title: string;
  passingScore: number;
  questions: CreateQuizQuestionParams[];
};

// ── Factory ────────────────────────────────────────────────────────────────

export function createQuiz(params: CreateQuizParams): Result<Quiz, CreateQuizError> {
  if (!params.id.trim()) return Result.err({ kind: "invalid_id" });
  if (!params.courseId.trim()) return Result.err({ kind: "invalid_course_id" });
  if (!params.title.trim()) return Result.err({ kind: "invalid_title" });

  if (params.passingScore < 0 || params.passingScore > 100) {
    return Result.err({ kind: "invalid_passing_score" });
  }

  if (params.questions.length === 0) {
    return Result.err({ kind: "no_questions" });
  }

  for (const q of params.questions) {
    const correctCount = q.options.filter((o) => o.isCorrect).length;
    if (correctCount === 0) return Result.err({ kind: "question_missing_correct_option" });
    if (correctCount > 1) return Result.err({ kind: "question_multiple_correct_options" });
  }

  return Result.ok({
    id: params.id,
    courseId: params.courseId,
    title: params.title.trim(),
    passingScore: params.passingScore,
    questions: params.questions.map((q) => ({
      id: q.id,
      questionText: q.questionText,
      options: q.options.map((o) => ({ ...o })),
    })),
  });
}

// ── Query helpers ─────────────────────────────────────────────────────────

export function quizQuestionCount(quiz: Quiz): number {
  return quiz.questions.length;
}

export function quizCorrectOptionId(quiz: Quiz, questionId: string): string | null {
  const question = quiz.questions.find((q) => q.id === questionId);
  if (!question) return null;
  const correct = question.options.find((o) => o.isCorrect);
  return correct ? correct.id : null;
}

export function quizCorrectAnswers(quiz: Quiz): Map<string, string> {
  const map = new Map<string, string>();
  for (const q of quiz.questions) {
    const correct = q.options.find((o) => o.isCorrect);
    if (correct) map.set(q.id, correct.id);
  }
  return map;
}

/**
 * QuizAttemptReview — per-question review shown after a completed
 * quiz attempt (the learner's pick, the correct pick, and the
 * explanation), regardless of whether the attempt passed.
 *
 * Pure domain helper: no IO, no framework imports. Built once a
 * `QuizAttempt` has answers for every question in its `Quiz`.
 */

import type { Quiz } from "./Quiz";
import type { QuizAttemptAnswer } from "./QuizAttempt";

export interface QuizAttemptReviewItem {
  readonly questionId: string;
  readonly selectedOptionId: string;
  readonly correctOptionId: string;
  readonly explanation: string;
}

/**
 * Builds one review item per answered question that has a correct
 * option on record. `createQuiz` guarantees every question has
 * exactly one correct option, so in practice this covers every
 * answered question; a question with no matching answer (shouldn't
 * happen for a completed attempt) is simply omitted rather than
 * throwing, since this is read-only presentation data.
 */
export function buildQuizAttemptReview(
  quiz: Quiz,
  answers: readonly QuizAttemptAnswer[],
): readonly QuizAttemptReviewItem[] {
  const selectedByQuestion = new Map(answers.map((a) => [a.questionId, a.selectedOptionId]));

  const review: QuizAttemptReviewItem[] = [];
  for (const question of quiz.questions) {
    const selectedOptionId = selectedByQuestion.get(question.id);
    const correctOption = question.options.find((o) => o.isCorrect);
    if (!selectedOptionId || !correctOption) continue;

    review.push({
      questionId: question.id,
      selectedOptionId,
      correctOptionId: correctOption.id,
      explanation: question.explanation,
    });
  }

  return review;
}

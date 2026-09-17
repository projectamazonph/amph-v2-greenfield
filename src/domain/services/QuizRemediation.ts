/**
 * Pure lesson-to-tool bridge helpers for quiz remediation (LEARN-041).
 *
 * The plan builder reads a quiz and the learner's answers, finds
 * every missed question, and returns one entry per missed question
 * (lesson slugs from `remediationRefs`, deduped, sorted, with the
 * question text). Empty remediationRefs contribute nothing. The
 * function is pure so it can be unit-tested without any framework
 * or database dependency.
 */

import type { Quiz } from "@/domain/entities/Quiz";
import { quizCorrectAnswers } from "@/domain/entities/Quiz";
import type { QuizAttempt, QuizAttemptAnswer } from "@/domain/entities/QuizAttempt";

export interface RemediationItem {
  readonly questionId: string;
  readonly questionText: string;
  readonly lessonSlugs: readonly string[];
}

export interface RemediationPlan {
  readonly missedCount: number;
  readonly totalCount: number;
  readonly items: readonly RemediationItem[];
  readonly distinctLessonSlugs: readonly string[];
}

/**
 * Returns a remediation plan for the given attempt. A learner who
 * passed every question gets `items: []` regardless of tags. The
 * plan is deterministic: items are emitted in question order;
 * `distinctLessonSlugs` is sorted alphabetically for a stable diff.
 *
 * Tags are optional. A missed question with no `remediationRefs`
 * still appears in `items` (with an empty `lessonSlugs` array) so
 * the UI can show the learner which question tripped them, even
 * when no review material was authored.
 */
export function buildQuizRemediationPlan(
  quiz: Quiz,
  attempt: Pick<QuizAttempt, "answers" | "passed">,
): RemediationPlan {
  const correctByQuestion = quizCorrectAnswers(quiz);
  const answersByQuestion = new Map<string, QuizAttemptAnswer["selectedOptionId"]>();
  for (const answer of attempt.answers) {
    answersByQuestion.set(answer.questionId, answer.selectedOptionId);
  }

  const items: RemediationItem[] = [];
  for (const question of quiz.questions) {
    const correct = correctByQuestion.get(question.id);
    if (correct === undefined) continue;
    const selected = answersByQuestion.get(question.id);
    if (selected === undefined) continue;
    if (selected === correct) continue;
    items.push({
      questionId: question.id,
      questionText: question.questionText,
      lessonSlugs: [...question.remediationRefs],
    });
  }

  const distinctLessonSlugs = Array.from(new Set(items.flatMap((item) => item.lessonSlugs))).sort();

  return {
    missedCount: items.length,
    totalCount: quiz.questions.length,
    items,
    distinctLessonSlugs,
  };
}

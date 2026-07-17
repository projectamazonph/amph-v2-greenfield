/**
 * QuizAttempt entity tests — TDD (red first).
 *
 * STORY-031: Quiz + QuizAttempt models + repositories.
 *
 * These tests describe the desired behavior.
 * Write them first. Run them — they must fail.
 * Then write the minimum code to make them pass.
 */

import { describe, it, expect } from "vitest";
import {
  startQuizAttempt,
  answerQuestion,
  completeQuizAttempt,
  attemptAllAnswered,
  attemptAnsweredCount,
} from "../QuizAttempt";
import { createQuiz } from "../Quiz";
import type { Quiz } from "../Quiz";

// ── Fixtures ────────────────────────────────────────────────────────────────

/** Creates a valid 2-question quiz for use in tests. */
function makeQuiz(): Quiz {
  const r = createQuiz({
    id: "quiz-1",
    courseId: "course-1",
    title: "PPC Basics",
    passingScore: 70,
    questions: [
      {
        id: "q1",
        questionText: "What does PPC stand for?",
        options: [
          { id: "o1", optionText: "Pay Per Click", isCorrect: true },
          { id: "o2", optionText: "Post Paid Credit", isCorrect: false },
        ],
      },
      {
        id: "q2",
        questionText: "What does CPC stand for?",
        options: [
          { id: "o3", optionText: "Cost Per Click", isCorrect: true },
          { id: "o4", optionText: "Cost Per Conversion", isCorrect: false },
        ],
      },
    ],
  });
  if (!r.ok) throw new Error("Fixture quiz creation failed");
  return r.value;
}

/** Helper: valid IDs for a quiz's questions and options. */
function quizIds(quiz: Quiz) {
  return {
    questionIds: quiz.questions.map((q) => q.id),
    optionIds: quiz.questions.flatMap((q) => q.options.map((o) => o.id)),
  };
}

// ── RED: startQuizAttempt ──────────────────────────────────────────────────

describe("startQuizAttempt", () => {
  it("returns ok with an in_progress attempt", () => {
    const result = startQuizAttempt({
      id: "attempt-1",
      userId: "user-1",
      quizId: "quiz-1",
    });
    expect(result.ok).toBe(true);
  });

  it("sets status to in_progress", () => {
    const result = startQuizAttempt({
      id: "attempt-1",
      userId: "user-1",
      quizId: "quiz-1",
    });
    if (!result.ok) return;
    expect(result.value.status).toBe("in_progress");
  });

  it("has empty answers initially", () => {
    const result = startQuizAttempt({
      id: "attempt-1",
      userId: "user-1",
      quizId: "quiz-1",
    });
    if (!result.ok) return;
    expect(result.value.answers).toHaveLength(0);
  });

  it("has null score and passed initially", () => {
    const result = startQuizAttempt({
      id: "attempt-1",
      userId: "user-1",
      quizId: "quiz-1",
    });
    if (!result.ok) return;
    expect(result.value.score).toBeNull();
    expect(result.value.passed).toBeNull();
  });

  it("has null completedAt initially", () => {
    const result = startQuizAttempt({
      id: "attempt-1",
      userId: "user-1",
      quizId: "quiz-1",
    });
    if (!result.ok) return;
    expect(result.value.completedAt).toBeNull();
  });

  it("rejects empty id", () => {
    const result = startQuizAttempt({ id: "  ", userId: "user-1", quizId: "quiz-1" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("invalid_id");
  });

  it("rejects empty userId", () => {
    const result = startQuizAttempt({ id: "attempt-1", userId: "", quizId: "quiz-1" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("invalid_user_id");
  });

  it("rejects empty quizId", () => {
    const result = startQuizAttempt({ id: "attempt-1", userId: "user-1", quizId: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("invalid_quiz_id");
  });
});

// ── RED: answerQuestion ────────────────────────────────────────────────────

describe("answerQuestion", () => {
  it("adds an answer to the attempt", () => {
    const quiz = makeQuiz();
    const ids = quizIds(quiz);
    const started = startQuizAttempt({ id: "attempt-1", userId: "user-1", quizId: "quiz-1" });
    if (!started.ok) return;

    const result = answerQuestion({
      attempt: started.value,
      questionId: "q1",
      selectedOptionId: "o1",
      quizQuestionIds: ids.questionIds,
      quizOptionIds: ids.optionIds,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.answers).toHaveLength(1);
    expect(result.value.answers[0]!.questionId).toBe("q1");
    expect(result.value.answers[0]!.selectedOptionId).toBe("o1");
  });

  it("replaces previous answer for the same question", () => {
    const quiz = makeQuiz();
    const ids = quizIds(quiz);
    const started = startQuizAttempt({ id: "attempt-1", userId: "user-1", quizId: "quiz-1" });
    if (!started.ok) return;

    const first = answerQuestion({
      attempt: started.value,
      questionId: "q1",
      selectedOptionId: "o1",
      quizQuestionIds: ids.questionIds,
      quizOptionIds: ids.optionIds,
    });
    if (!first.ok) return;

    const second = answerQuestion({
      attempt: first.value,
      questionId: "q1",
      selectedOptionId: "o2", // change answer
      quizQuestionIds: ids.questionIds,
      quizOptionIds: ids.optionIds,
    });
    if (!second.ok) return;

    expect(second.value.answers).toHaveLength(1); // still 1, not 2
    expect(second.value.answers[0]!.selectedOptionId).toBe("o2");
  });

  it("rejects invalid questionId", () => {
    const quiz = makeQuiz();
    const ids = quizIds(quiz);
    const started = startQuizAttempt({ id: "attempt-1", userId: "user-1", quizId: "quiz-1" });
    if (!started.ok) return;

    const result = answerQuestion({
      attempt: started.value,
      questionId: "nonexistent",
      selectedOptionId: "o1",
      quizQuestionIds: ids.questionIds,
      quizOptionIds: ids.optionIds,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("invalid_question_id");
  });

  it("rejects invalid optionId", () => {
    const quiz = makeQuiz();
    const ids = quizIds(quiz);
    const started = startQuizAttempt({ id: "attempt-1", userId: "user-1", quizId: "quiz-1" });
    if (!started.ok) return;

    const result = answerQuestion({
      attempt: started.value,
      questionId: "q1",
      selectedOptionId: "nonexistent",
      quizQuestionIds: ids.questionIds,
      quizOptionIds: ids.optionIds,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("invalid_option_id");
  });

  it("rejects answering on a completed attempt", () => {
    const quiz = makeQuiz();
    const ids = quizIds(quiz);
    const started = startQuizAttempt({ id: "attempt-1", userId: "user-1", quizId: "quiz-1" });
    if (!started.ok) return;

    const a1 = answerQuestion({
      attempt: started.value,
      questionId: "q1",
      selectedOptionId: "o1",
      quizQuestionIds: ids.questionIds,
      quizOptionIds: ids.optionIds,
    });
    if (!a1.ok) return;

    const a2 = answerQuestion({
      attempt: a1.value,
      questionId: "q2",
      selectedOptionId: "o3",
      quizQuestionIds: ids.questionIds,
      quizOptionIds: ids.optionIds,
    });
    if (!a2.ok) return;

    const completed = completeQuizAttempt({ attempt: a2.value, quiz });
    if (!completed.ok) return;

    // Attempt is now completed — cannot answer further
    const result = answerQuestion({
      attempt: completed.value,
      questionId: "q1",
      selectedOptionId: "o2",
      quizQuestionIds: ids.questionIds,
      quizOptionIds: ids.optionIds,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("already_completed");
  });
});

// ── RED: completeQuizAttempt ────────────────────────────────────────────────

describe("completeQuizAttempt", () => {
  it("calculates score 100% and passed=true when all answers correct", () => {
    const quiz = makeQuiz();
    const ids = quizIds(quiz);
    const started = startQuizAttempt({ id: "attempt-1", userId: "user-1", quizId: "quiz-1" });
    if (!started.ok) return;

    const a1 = answerQuestion({
      attempt: started.value,
      questionId: "q1",
      selectedOptionId: "o1", // correct
      quizQuestionIds: ids.questionIds,
      quizOptionIds: ids.optionIds,
    });
    if (!a1.ok) return;

    const a2 = answerQuestion({
      attempt: a1.value,
      questionId: "q2",
      selectedOptionId: "o3", // correct
      quizQuestionIds: ids.questionIds,
      quizOptionIds: ids.optionIds,
    });
    if (!a2.ok) return;

    const result = completeQuizAttempt({ attempt: a2.value, quiz });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe("completed");
    expect(result.value.score).toBe(100);
    expect(result.value.passed).toBe(true);
    expect(result.value.completedAt).not.toBeNull();
  });

  it("calculates score 50% and passed=false when 1 of 2 answers wrong", () => {
    const quiz = makeQuiz();
    const ids = quizIds(quiz);
    const started = startQuizAttempt({ id: "attempt-1", userId: "user-1", quizId: "quiz-1" });
    if (!started.ok) return;

    const a1 = answerQuestion({
      attempt: started.value,
      questionId: "q1",
      selectedOptionId: "o1", // correct
      quizQuestionIds: ids.questionIds,
      quizOptionIds: ids.optionIds,
    });
    if (!a1.ok) return;

    const a2 = answerQuestion({
      attempt: a1.value,
      questionId: "q2",
      selectedOptionId: "o4", // wrong — o3 is correct
      quizQuestionIds: ids.questionIds,
      quizOptionIds: ids.optionIds,
    });
    if (!a2.ok) return;

    const result = completeQuizAttempt({ attempt: a2.value, quiz });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.score).toBe(50);
    expect(result.value.passed).toBe(false);
  });

  it("passes when score equals passingScore (boundary case)", () => {
    const quizR = createQuiz({
      id: "quiz-2",
      courseId: "course-1",
      title: "Boundary Quiz",
      passingScore: 100,
      questions: [
        {
          id: "q1",
          questionText: "What?",
          options: [
            { id: "o1", optionText: "Right", isCorrect: true },
            { id: "o2", optionText: "Wrong", isCorrect: false },
          ],
        },
      ],
    });
    if (!quizR.ok) return;
    const quiz = quizR.value;
    const ids = quizIds(quiz);

    const started = startQuizAttempt({ id: "attempt-1", userId: "user-1", quizId: "quiz-2" });
    if (!started.ok) return;

    const a1 = answerQuestion({
      attempt: started.value,
      questionId: "q1",
      selectedOptionId: "o1",
      quizQuestionIds: ids.questionIds,
      quizOptionIds: ids.optionIds,
    });
    if (!a1.ok) return;

    const result = completeQuizAttempt({ attempt: a1.value, quiz });
    if (!result.ok) return;
    expect(result.value.score).toBe(100);
    expect(result.value.passed).toBe(true); // 100 >= 100
  });

  it("fails if attempt is already completed", () => {
    const quiz = makeQuiz();
    const ids = quizIds(quiz);
    const started = startQuizAttempt({ id: "attempt-1", userId: "user-1", quizId: "quiz-1" });
    if (!started.ok) return;

    const a1 = answerQuestion({
      attempt: started.value,
      questionId: "q1",
      selectedOptionId: "o1",
      quizQuestionIds: ids.questionIds,
      quizOptionIds: ids.optionIds,
    });
    if (!a1.ok) return;

    const a2 = answerQuestion({
      attempt: a1.value,
      questionId: "q2",
      selectedOptionId: "o3",
      quizQuestionIds: ids.questionIds,
      quizOptionIds: ids.optionIds,
    });
    if (!a2.ok) return;

    const completed = completeQuizAttempt({ attempt: a2.value, quiz });
    if (!completed.ok) return;

    // Try to complete again
    const result = completeQuizAttempt({ attempt: completed.value, quiz });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("attempt_not_in_progress");
  });

  it("fails if any question is unanswered", () => {
    const quiz = makeQuiz();
    const ids = quizIds(quiz);
    const started = startQuizAttempt({ id: "attempt-1", userId: "user-1", quizId: "quiz-1" });
    if (!started.ok) return;

    // Only answer q1, skip q2
    const a1 = answerQuestion({
      attempt: started.value,
      questionId: "q1",
      selectedOptionId: "o1",
      quizQuestionIds: ids.questionIds,
      quizOptionIds: ids.optionIds,
    });
    if (!a1.ok) return;

    const result = completeQuizAttempt({ attempt: a1.value, quiz });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const err = result.error as { kind: "not_all_questions_answered"; unanswered: readonly string[] };
      expect(err.kind).toBe("not_all_questions_answered");
      expect(err.unanswered).toContain("q2");
    }
  });
});

// ── RED: Query helpers ──────────────────────────────────────────────────────

describe("attemptAllAnswered", () => {
  it("returns false when no questions answered", () => {
    const quiz = makeQuiz();
    const started = startQuizAttempt({ id: "attempt-1", userId: "user-1", quizId: "quiz-1" });
    if (!started.ok) return;
    expect(attemptAllAnswered(started.value, quiz.questions.length)).toBe(false);
  });

  it("returns true when all questions answered", () => {
    const quiz = makeQuiz();
    const ids = quizIds(quiz);
    const started = startQuizAttempt({ id: "attempt-1", userId: "user-1", quizId: "quiz-1" });
    if (!started.ok) return;

    const a1 = answerQuestion({
      attempt: started.value,
      questionId: "q1",
      selectedOptionId: "o1",
      quizQuestionIds: ids.questionIds,
      quizOptionIds: ids.optionIds,
    });
    if (!a1.ok) return;

    const a2 = answerQuestion({
      attempt: a1.value,
      questionId: "q2",
      selectedOptionId: "o3",
      quizQuestionIds: ids.questionIds,
      quizOptionIds: ids.optionIds,
    });
    if (!a2.ok) return;

    expect(attemptAllAnswered(a2.value, quiz.questions.length)).toBe(true);
  });
});

describe("attemptAnsweredCount", () => {
  it("returns 0 for a fresh attempt", () => {
    const started = startQuizAttempt({ id: "attempt-1", userId: "user-1", quizId: "quiz-1" });
    if (!started.ok) return;
    expect(attemptAnsweredCount(started.value)).toBe(0);
  });

  it("returns the correct count after answering questions", () => {
    const quiz = makeQuiz();
    const ids = quizIds(quiz);
    const started = startQuizAttempt({ id: "attempt-1", userId: "user-1", quizId: "quiz-1" });
    if (!started.ok) return;

    const a1 = answerQuestion({
      attempt: started.value,
      questionId: "q1",
      selectedOptionId: "o1",
      quizQuestionIds: ids.questionIds,
      quizOptionIds: ids.optionIds,
    });
    if (!a1.ok) return;

    expect(attemptAnsweredCount(a1.value)).toBe(1);

    const a2 = answerQuestion({
      attempt: a1.value,
      questionId: "q2",
      selectedOptionId: "o3",
      quizQuestionIds: ids.questionIds,
      quizOptionIds: ids.optionIds,
    });
    if (!a2.ok) return;

    expect(attemptAnsweredCount(a2.value)).toBe(2);
  });
});

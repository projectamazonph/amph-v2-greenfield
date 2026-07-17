/**
 * Quiz entity tests — TDD (red first).
 *
 * STORY-031: Quiz + QuizAttempt models + repositories.
 *
 * These tests describe the desired behavior.
 * Write them first. Run them — they must fail.
 * Then write the minimum code to make them pass.
 */

import { describe, it, expect } from "vitest";
import {
  createQuiz,
  quizQuestionCount,
  quizCorrectOptionId,
  quizCorrectAnswers,
} from "../Quiz";
import type { CreateQuizParams } from "../Quiz";

// ── Fixture helpers ───────────────────────────────────────

/** A minimal valid quiz with 2 questions. */
const validQuiz: CreateQuizParams = {
  id: "quiz-1",
  courseId: "course-1",
  title: "Amazon PPC Basics",
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
};

// ── RED: createQuiz — happy path ─────────────────────────────────────

describe("createQuiz", () => {
  it("returns ok with a valid quiz", () => {
    const result = createQuiz(validQuiz);
    expect(result.ok).toBe(true);
  });

  it("returns the quiz with all fields", () => {
    const result = createQuiz(validQuiz);
    if (!result.ok) return;
    expect(result.value.id).toBe("quiz-1");
    expect(result.value.courseId).toBe("course-1");
    expect(result.value.title).toBe("Amazon PPC Basics");
    expect(result.value.passingScore).toBe(70);
    expect(result.value.questions).toHaveLength(2);
  });

  it("trims title whitespace", () => {
    const result = createQuiz({ ...validQuiz, title: "  PPC Quiz  " });
    if (!result.ok) return;
    expect(result.value.title).toBe("PPC Quiz");
  });

  it("accepts passingScore of 0 (no questions required to pass)", () => {
    const result = createQuiz({ ...validQuiz, passingScore: 0 });
    expect(result.ok).toBe(true);
  });

  it("accepts passingScore of 100 (must get everything right)", () => {
    const result = createQuiz({ ...validQuiz, passingScore: 100 });
    expect(result.ok).toBe(true);
  });
});

// ── RED: Fail-fast validations ─────────────────────────────────────

describe("createQuiz — invalid_id", () => {
  it("rejects empty id", () => {
    const result = createQuiz({ ...validQuiz, id: "  " });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("invalid_id");
  });
});

describe("createQuiz — invalid_course_id", () => {
  it("rejects empty courseId", () => {
    const result = createQuiz({ ...validQuiz, courseId: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("invalid_course_id");
  });
});

describe("createQuiz — invalid_title", () => {
  it("rejects empty title", () => {
    const result = createQuiz({ ...validQuiz, title: "   " });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("invalid_title");
  });
});

describe("createQuiz — invalid_passing_score", () => {
  it("rejects negative passingScore", () => {
    const result = createQuiz({ ...validQuiz, passingScore: -1 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("invalid_passing_score");
  });

  it("rejects passingScore above 100", () => {
    const result = createQuiz({ ...validQuiz, passingScore: 101 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("invalid_passing_score");
  });
});

describe("createQuiz — no_questions", () => {
  it("rejects a quiz with zero questions", () => {
    const result = createQuiz({ ...validQuiz, questions: [] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("no_questions");
  });
});

describe("createQuiz — question_missing_correct_option", () => {
  it("rejects a question with no correct option", () => {
    const result = createQuiz({
      ...validQuiz,
      questions: [
        {
          id: "q1",
          questionText: "What?",
          options: [
            { id: "o1", optionText: "Wrong", isCorrect: false },
            { id: "o2", optionText: "Also wrong", isCorrect: false },
          ],
        },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("question_missing_correct_option");
  });
});

describe("createQuiz — question_multiple_correct_options", () => {
  it("rejects a question with more than one correct option", () => {
    const result = createQuiz({
      ...validQuiz,
      questions: [
        {
          id: "q1",
          questionText: "Which are true?",
          options: [
            { id: "o1", optionText: "A", isCorrect: true },
            { id: "o2", optionText: "B", isCorrect: true },
          ],
        },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("question_multiple_correct_options");
  });
});

// ── RED: Query helpers ──────────────────────────────────────────────

describe("quizQuestionCount", () => {
  it("returns the total number of questions", () => {
    const result = createQuiz(validQuiz);
    if (!result.ok) return;
    expect(quizQuestionCount(result.value)).toBe(2);
  });
});

describe("quizCorrectOptionId", () => {
  it("returns the id of the correct option for a question", () => {
    const result = createQuiz(validQuiz);
    if (!result.ok) return;
    expect(quizCorrectOptionId(result.value, "q1")).toBe("o1"); // first question: o1 is correct
    expect(quizCorrectOptionId(result.value, "q2")).toBe("o3"); // second question: o3 is correct
  });

  it("returns null for a non-existent question", () => {
    const result = createQuiz(validQuiz);
    if (!result.ok) return;
    expect(quizCorrectOptionId(result.value, "nonexistent")).toBeNull();
  });
});

describe("quizCorrectAnswers", () => {
  it("returns a Map of questionId → correctOptionId for all questions", () => {
    const result = createQuiz(validQuiz);
    if (!result.ok) return;
    const map = quizCorrectAnswers(result.value);
    expect(map.get("q1")).toBe("o1");
    expect(map.get("q2")).toBe("o3");
    expect(map.size).toBe(2);
  });
});

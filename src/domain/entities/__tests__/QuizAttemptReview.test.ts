/**
 * QuizAttemptReview tests.
 */

import { describe, it, expect } from "vitest";
import { buildQuizAttemptReview } from "../QuizAttemptReview";
import { createQuiz } from "../Quiz";
import type { CreateQuizParams } from "../Quiz";

const quizParams: CreateQuizParams = {
  id: "quiz-1",
  courseId: "course-1",
  title: "Amazon PPC Basics",
  passingScore: 70,
  questions: [
    {
      id: "q1",
      questionText: "What does PPC stand for?",
      explanation: "PPC = Pay Per Click, what you pay each time someone clicks your ad.",
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

function makeQuiz() {
  const r = createQuiz(quizParams);
  if (!r.ok) throw new Error("fixture failed");
  return r.value;
}

describe("buildQuizAttemptReview", () => {
  it("returns one review item per answered question", () => {
    const quiz = makeQuiz();
    const review = buildQuizAttemptReview(quiz, [
      { questionId: "q1", selectedOptionId: "o2" },
      { questionId: "q2", selectedOptionId: "o3" },
    ]);

    expect(review).toHaveLength(2);
  });

  it("includes the learner's pick, the correct pick, and the explanation", () => {
    const quiz = makeQuiz();
    const review = buildQuizAttemptReview(quiz, [
      { questionId: "q1", selectedOptionId: "o2" }, // wrong
      { questionId: "q2", selectedOptionId: "o3" }, // correct
    ]);

    const q1Review = review.find((r) => r.questionId === "q1");
    expect(q1Review).toMatchObject({
      selectedOptionId: "o2",
      correctOptionId: "o1",
      explanation: "PPC = Pay Per Click, what you pay each time someone clicks your ad.",
    });

    const q2Review = review.find((r) => r.questionId === "q2");
    expect(q2Review).toMatchObject({
      selectedOptionId: "o3",
      correctOptionId: "o3",
      explanation: "",
    });
  });

  it("omits questions with no matching answer", () => {
    const quiz = makeQuiz();
    const review = buildQuizAttemptReview(quiz, [{ questionId: "q1", selectedOptionId: "o1" }]);

    expect(review).toHaveLength(1);
    expect(review[0]!.questionId).toBe("q1");
  });

  it("returns an empty array when no answers are given", () => {
    const quiz = makeQuiz();
    expect(buildQuizAttemptReview(quiz, [])).toEqual([]);
  });
});

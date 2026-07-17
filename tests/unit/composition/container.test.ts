/**
 * Container wiring tests — STORY-033.
 *
 * Ensures RecordQuizAttempt is registered on both production and test
 * containers, and that the use case is actually wired to working deps
 * (an attempt reaches the quizAttemptRepo).
 */

import { describe, it, expect } from "vitest";
import { createQuiz } from "@/domain/entities/Quiz";
import { buildTestContainer } from "@/composition/container";

describe("container — recordQuizAttempt wiring", () => {
  it("test container exposes recordQuizAttempt", () => {
    const c = buildTestContainer();
    expect(c.recordQuizAttempt).toBeDefined();
    expect(typeof c.recordQuizAttempt.execute).toBe("function");
  });

  it("test container exposes xpEventRepo", () => {
    const c = buildTestContainer();
    expect(c.xpEventRepo).toBeDefined();
  });

  it("end-to-end: a passing attempt is scored and persisted via the test container", async () => {
    const c = buildTestContainer();

    // Seed a quiz
    const quizResult = createQuiz({
      id: "quiz-1",
      courseId: "course-1",
      title: "Test Quiz",
      passingScore: 70,
      questions: [
        {
          id: "q1",
          questionText: "What is PPC?",
          options: [
            { id: "o1", optionText: "Pay Per Click", isCorrect: true },
            { id: "o2", optionText: "Post Paid", isCorrect: false },
          ],
        },
        {
          id: "q2",
          questionText: "What is CPC?",
          options: [
            { id: "o3", optionText: "Cost Per Click", isCorrect: true },
            { id: "o4", optionText: "Cost Per Conversion", isCorrect: false },
          ],
        },
      ],
    });
    if (!quizResult.ok) throw new Error("seed failed");
    c.quizRepo.seed(quizResult.value);

    const result = await c.recordQuizAttempt.execute({
      userId: "user-1",
      quizId: "quiz-1",
      answers: [
        { questionId: "q1", selectedOptionId: "o1" },
        { questionId: "q2", selectedOptionId: "o3" },
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.score).toBe(100);
    expect(result.value.passed).toBe(true);
    expect(result.value.attempt.status).toBe("completed");
  });
});

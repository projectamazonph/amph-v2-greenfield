import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  getSessionUserId: vi.fn(),
  execute: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/lib/auth", () => ({
  getSessionUserId: mocks.getSessionUserId,
}));

vi.mock("@/composition/container", () => ({
  buildContainer: () => ({
    recordQuizAttempt: { execute: mocks.execute },
  }),
}));

import { submitQuizAttemptAction } from "../submitQuizAttempt.action";

describe("submitQuizAttemptAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSessionUserId.mockResolvedValue("student-1");
  });

  it("requires an authenticated student", async () => {
    mocks.getSessionUserId.mockResolvedValue(null);

    await expect(
      submitQuizAttemptAction({
        quizId: "quiz-1",
        answers: [{ questionId: "q-1", selectedOptionId: "o-1" }],
      }),
    ).resolves.toEqual({ ok: false, error: "not_authenticated" });
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it("rejects malformed answers before reaching the use case", async () => {
    await expect(submitQuizAttemptAction({ quizId: "", answers: [] })).resolves.toEqual({
      ok: false,
      error: "invalid_submission",
    });
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it("returns a serializable learner result", async () => {
    mocks.execute.mockResolvedValue({
      ok: true,
      value: {
        attempt: { id: "attempt-1", startedAt: new Date() },
        score: 100,
        passed: true,
        xpAwarded: 20,
        correctCount: 1,
        totalQuestions: 1,
        review: [
          {
            questionId: "q-1",
            selectedOptionId: "o-1",
            correctOptionId: "o-1",
            explanation: "Correct.",
          },
        ],
      },
    });

    const result = await submitQuizAttemptAction({
      quizId: "quiz-1",
      answers: [{ questionId: "q-1", selectedOptionId: "o-1" }],
    });

    expect(mocks.execute).toHaveBeenCalledWith({
      userId: "student-1",
      quizId: "quiz-1",
      answers: [{ questionId: "q-1", selectedOptionId: "o-1" }],
    });
    expect(result).toEqual({
      ok: true,
      score: 100,
      passed: true,
      xpAwarded: 20,
      correctCount: 1,
      totalQuestions: 1,
      review: [
        {
          questionId: "q-1",
          selectedOptionId: "o-1",
          correctOptionId: "o-1",
          explanation: "Correct.",
        },
      ],
    });
    expect(JSON.stringify(result)).not.toContain("startedAt");
  });

  it("maps authorization failures without leaking internal details", async () => {
    mocks.execute.mockResolvedValue({ ok: false, error: { kind: "access_denied" } });

    await expect(
      submitQuizAttemptAction({
        quizId: "quiz-1",
        answers: [{ questionId: "q-1", selectedOptionId: "o-1" }],
      }),
    ).resolves.toEqual({ ok: false, error: "access_denied" });
  });
});

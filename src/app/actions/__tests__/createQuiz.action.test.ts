import { describe, it, expect, vi } from "vitest";
import { Result } from "@/domain/shared/Result";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({ get: vi.fn(), set: vi.fn(), delete: vi.fn() }),
}));

import { performCreateQuiz, type CurrentUserSummary } from "../createQuiz.action";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import { buildTestContainer } from "@/composition/container.test";

function getCurrentUser(
  returnValue: CurrentUserSummary | null,
): (container: { userRepo: UserRepository }) => Promise<CurrentUserSummary | null> {
  return async () => returnValue;
}

const validInput = {
  id: "q1",
  courseId: "c1",
  title: "Quiz 1",
  passingScore: 70,
  questions: [
    {
      id: "q1_q1",
      questionText: "Q?",
      options: [
        { id: "o1", optionText: "A", isCorrect: true },
        { id: "o2", optionText: "B", isCorrect: false },
      ],
    },
  ],
};

describe("performCreateQuiz", () => {
  it("returns unauthorized when no session user", async () => {
    const container = buildTestContainer();
    const r = await performCreateQuiz(container, validInput, getCurrentUser(null));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("unauthorized");
  });

  it("returns invalid_passing_score from validation", async () => {
    const container = buildTestContainer();
    const r = await performCreateQuiz(
      container,
      { ...validInput, passingScore: 150 },
      getCurrentUser({ id: "u-1", role: "ADMIN" }),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("invalid_passing_score");
  });

  it("returns no_questions when the question list is empty", async () => {
    const container = buildTestContainer();
    const r = await performCreateQuiz(
      container,
      { ...validInput, questions: [] },
      getCurrentUser({ id: "u-1", role: "ADMIN" }),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("no_questions");
  });

  it("returns the new quiz id on success", async () => {
    const container = buildTestContainer();
    const r = await performCreateQuiz(
      container,
      validInput,
      getCurrentUser({ id: "u-1", role: "ADMIN" }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.quizId).toBe("q1");
  });

  it("propagates db_error from the use case", async () => {
    const container = buildTestContainer();
    container.adminCreateQuiz.execute = async () =>
      Result.err({ kind: "db_error", message: "down" });
    const r = await performCreateQuiz(
      container,
      validInput,
      getCurrentUser({ id: "u-1", role: "ADMIN" }),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
  });
});

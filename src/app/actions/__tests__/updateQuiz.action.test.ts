import { describe, it, expect, vi } from "vitest";
import { Result } from "@/domain/shared/Result";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({ get: vi.fn(), set: vi.fn(), delete: vi.fn() }),
}));

import { performUpdateQuiz, type CurrentUserSummary } from "../updateQuiz.action";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import { buildTestContainer } from "@/composition/container.test";
import { createQuiz } from "@/domain/entities/Quiz";

function getCurrentUser(
  returnValue: CurrentUserSummary | null,
): (container: { userRepo: UserRepository }) => Promise<CurrentUserSummary | null> {
  return async () => returnValue;
}

const validInput = {
  id: "q1",
  courseId: "c1",
  title: "Updated",
  passingScore: 80,
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

describe("performUpdateQuiz", () => {
  it("returns unauthorized when no session user", async () => {
    const container = buildTestContainer();
    const r = await performUpdateQuiz(container, validInput, getCurrentUser(null));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("unauthorized");
  });

  it("returns not_found from the use case", async () => {
    const container = buildTestContainer();
    container.adminUpdateQuiz.execute = async () => Result.err({ kind: "not_found" });
    const r = await performUpdateQuiz(
      container,
      validInput,
      getCurrentUser({ id: "u-1", role: "ADMIN" }),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("not_found");
  });

  it("returns invalid_passing_score from validation", async () => {
    const container = buildTestContainer();
    const r = await performUpdateQuiz(
      container,
      { ...validInput, passingScore: -1 },
      getCurrentUser({ id: "u-1", role: "ADMIN" }),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("invalid_passing_score");
  });

  it("returns the updated quiz id on success", async () => {
    const container = buildTestContainer();
    // Seed the existing quiz so update() doesn't 404.
    const seed = createQuiz({
      id: validInput.id,
      courseId: validInput.courseId,
      title: "Original",
      passingScore: 50,
      questions: validInput.questions,
    });
    if (!seed.ok) throw new Error("seed failed: " + JSON.stringify(seed.error));
    await container.quizRepo.create(seed.value);
    const r = await performUpdateQuiz(
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
    container.adminUpdateQuiz.execute = async () =>
      Result.err({ kind: "db_error", message: "down" });
    const r = await performUpdateQuiz(
      container,
      validInput,
      getCurrentUser({ id: "u-1", role: "ADMIN" }),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
  });
});

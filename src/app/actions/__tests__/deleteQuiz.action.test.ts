import { describe, it, expect, vi } from "vitest";
import { Result } from "@/domain/shared/Result";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({ get: vi.fn(), set: vi.fn(), delete: vi.fn() }),
}));

import { performDeleteQuiz, type CurrentUserSummary } from "../deleteQuiz.action";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import { buildTestContainer } from "@/composition/container.test";
import { createQuiz } from "@/domain/entities/Quiz";

function getCurrentUser(
  returnValue: CurrentUserSummary | null,
): (container: { userRepo: UserRepository }) => Promise<CurrentUserSummary | null> {
  return async () => returnValue;
}

describe("performDeleteQuiz", () => {
  it("returns unauthorized when no session user", async () => {
    const container = buildTestContainer();
    const r = await performDeleteQuiz(container, { quizId: "q1" }, getCurrentUser(null));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("unauthorized");
  });

  it("returns has_attempts with the attempt count", async () => {
    const container = buildTestContainer();
    container.adminDeleteQuiz.execute = async () =>
      Result.err({ kind: "has_attempts", attemptCount: 7 });
    const r = await performDeleteQuiz(
      container,
      { quizId: "q1" },
      getCurrentUser({ id: "u-1", role: "ADMIN" }),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("has_attempts");
    if (r.error.kind !== "has_attempts") return;
    expect(r.error.attemptCount).toBe(7);
  });

  it("returns not_found from the use case", async () => {
    const container = buildTestContainer();
    container.adminDeleteQuiz.execute = async () => Result.err({ kind: "not_found" });
    const r = await performDeleteQuiz(
      container,
      { quizId: "missing" },
      getCurrentUser({ id: "u-1", role: "ADMIN" }),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("not_found");
  });

  it("propagates db_error from the use case", async () => {
    const container = buildTestContainer();
    container.adminDeleteQuiz.execute = async () =>
      Result.err({ kind: "db_error", message: "down" });
    const r = await performDeleteQuiz(
      container,
      { quizId: "q1" },
      getCurrentUser({ id: "u-1", role: "ADMIN" }),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
  });

  it("returns deleted on success", async () => {
    const container = buildTestContainer();
    // Seed the quiz so delete() doesn't 404.
    const seed = createQuiz({
      id: "q1",
      courseId: "c1",
      title: "Q",
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
    });
    if (!seed.ok) throw new Error("seed failed: " + JSON.stringify(seed.error));
    await container.quizRepo.create(seed.value);
    const r = await performDeleteQuiz(
      container,
      { quizId: "q1" },
      getCurrentUser({ id: "u-1", role: "ADMIN" }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.deleted).toBe(true);
  });
});

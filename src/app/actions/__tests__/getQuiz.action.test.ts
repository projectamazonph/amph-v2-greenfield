import { describe, it, expect, vi } from "vitest";
import { Result } from "@/domain/shared/Result";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({ get: vi.fn(), set: vi.fn(), delete: vi.fn() }),
}));

import { performGetQuiz, type CurrentUserSummary } from "../getQuiz.action";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import { buildTestContainer } from "@/composition/container.test";

function getCurrentUser(
  returnValue: CurrentUserSummary | null,
): (container: { userRepo: UserRepository }) => Promise<CurrentUserSummary | null> {
  return async () => returnValue;
}

describe("performGetQuiz", () => {
  it("returns unauthorized when no session user", async () => {
    const container = buildTestContainer();
    const r = await performGetQuiz(container, { quizId: "q1" }, getCurrentUser(null));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("unauthorized");
  });

  it("returns quiz_not_found when the use case says so", async () => {
    const container = buildTestContainer();
    container.adminGetQuiz.execute = async () => Result.err({ kind: "quiz_not_found" });
    const r = await performGetQuiz(
      container,
      { quizId: "missing" },
      getCurrentUser({ id: "u-1", role: "ADMIN" }),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("quiz_not_found");
  });

  it("returns course_not_found when the use case says so", async () => {
    const container = buildTestContainer();
    container.adminGetQuiz.execute = async () => Result.err({ kind: "course_not_found" });
    const r = await performGetQuiz(
      container,
      { quizId: "q1" },
      getCurrentUser({ id: "u-1", role: "ADMIN" }),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("course_not_found");
  });

  it("propagates db_error from the use case", async () => {
    const container = buildTestContainer();
    container.adminGetQuiz.execute = async () => Result.err({ kind: "db_error", message: "down" });
    const r = await performGetQuiz(
      container,
      { quizId: "q1" },
      getCurrentUser({ id: "u-1", role: "ADMIN" }),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
  });
});

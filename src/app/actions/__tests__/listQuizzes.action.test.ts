import { describe, it, expect, vi } from "vitest";
import { Result } from "@/domain/shared/Result";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({ get: vi.fn(), set: vi.fn(), delete: vi.fn() }),
}));

import { performListQuizzes, type CurrentUserSummary } from "../listQuizzes.action";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import { buildTestContainer } from "@/composition/container.test";

function getCurrentUser(
  returnValue: CurrentUserSummary | null,
): (container: { userRepo: UserRepository }) => Promise<CurrentUserSummary | null> {
  return async () => returnValue;
}

describe("performListQuizzes", () => {
  it("returns unauthorized when no session user", async () => {
    const container = buildTestContainer();
    const r = await performListQuizzes(container, {}, getCurrentUser(null));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("unauthorized");
  });

  it("returns unauthorized when the user is not ADMIN", async () => {
    const container = buildTestContainer();
    const r = await performListQuizzes(
      container,
      {},
      getCurrentUser({ id: "u-1", role: "STUDENT" }),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("unauthorized");
  });

  it("returns an empty list when the repo has no quizzes", async () => {
    const container = buildTestContainer();
    const r = await performListQuizzes(container, {}, getCurrentUser({ id: "u-1", role: "ADMIN" }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.quizzes).toHaveLength(0);
    expect(r.value.courses.size).toBe(0);
  });

  it("propagates db_error from the use case", async () => {
    const container = buildTestContainer();
    container.adminListQuizzes.execute = async () =>
      Result.err({ kind: "db_error", message: "down" });
    const r = await performListQuizzes(container, {}, getCurrentUser({ id: "u-1", role: "ADMIN" }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
  });

  it("maps course_error to a course_error action error", async () => {
    const container = buildTestContainer();
    container.adminListQuizzes.execute = async () =>
      Result.err({ kind: "course_error", message: "missing" });
    const r = await performListQuizzes(container, {}, getCurrentUser({ id: "u-1", role: "ADMIN" }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("course_error");
  });
});

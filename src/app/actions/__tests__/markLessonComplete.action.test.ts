/**
 * markLessonComplete action — STORY-027.
 *
 * The MarkLessonComplete use case shipped with STORY-027 but had no
 * caller: it was absent from the container, had no server action and no
 * UI, so enrollment progress never moved off 0% and no lesson XP or
 * certificate was ever earned. These tests cover the action that closes
 * that gap.
 *
 * The container is mocked; the use case has its own suite at
 * tests/unit/usecases/MarkLessonComplete.test.ts.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

const mockGetSessionUserId = vi.fn();
vi.mock("@/lib/auth", () => ({
  getSessionUserId: () => mockGetSessionUserId(),
}));

const mockRevalidatePath = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: (path: string) => mockRevalidatePath(path),
}));

const mockMarkLessonComplete = vi.fn();
vi.mock("@/composition/container", () => ({
  buildContainer: () => ({
    markLessonComplete: { execute: mockMarkLessonComplete },
  }),
}));

import { markLessonComplete } from "../markLessonComplete.action";

const INPUT = {
  courseId: "course-1",
  courseSlug: "ppc-foundations",
  lessonId: "lesson-2",
};

function okResult(progressPercent: number, completedLessonIds: string[]) {
  return {
    ok: true as const,
    value: {
      enrollment: { completedLessonIds },
      progressEvent: { id: "pe-1" },
      progressPercent,
    },
  };
}

describe("markLessonComplete action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSessionUserId.mockResolvedValue("user-1");
    mockMarkLessonComplete.mockResolvedValue(okResult(50, ["lesson-1", "lesson-2"]));
  });

  it("refuses when there is no session", async () => {
    mockGetSessionUserId.mockResolvedValue(null);

    const result = await markLessonComplete(INPUT);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("unauthorized");
    expect(mockMarkLessonComplete).not.toHaveBeenCalled();
  });

  it("passes the session user id to the use case, never a client-supplied one", async () => {
    await markLessonComplete(INPUT);

    expect(mockMarkLessonComplete).toHaveBeenCalledWith({
      userId: "user-1",
      courseId: "course-1",
      lessonId: "lesson-2",
    });
  });

  it("returns the new progress percentage and completed lessons", async () => {
    const result = await markLessonComplete(INPUT);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.progressPercent).toBe(50);
    expect(result.value.completedLessonIds).toEqual(["lesson-1", "lesson-2"]);
    expect(result.value.courseCompleted).toBe(false);
  });

  it("flags course completion at 100%", async () => {
    mockMarkLessonComplete.mockResolvedValue(okResult(100, ["lesson-1", "lesson-2"]));

    const result = await markLessonComplete(INPUT);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.courseCompleted).toBe(true);
  });

  it("revalidates the lesson, course and dashboard so progress is not stale", async () => {
    await markLessonComplete(INPUT);

    const paths = mockRevalidatePath.mock.calls.map(([p]) => p);
    expect(paths).toContain("/courses/ppc-foundations/lessons/lesson-2");
    expect(paths).toContain("/courses/ppc-foundations");
    expect(paths).toContain("/dashboard");
  });

  it("surfaces use-case errors without revalidating", async () => {
    mockMarkLessonComplete.mockResolvedValue({
      ok: false,
      error: { kind: "enrollment_not_active" },
    });

    const result = await markLessonComplete(INPUT);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("enrollment_not_active");
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("surfaces lesson_not_in_course", async () => {
    mockMarkLessonComplete.mockResolvedValue({
      ok: false,
      error: { kind: "lesson_not_in_course" },
    });

    const result = await markLessonComplete(INPUT);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("lesson_not_in_course");
  });
});

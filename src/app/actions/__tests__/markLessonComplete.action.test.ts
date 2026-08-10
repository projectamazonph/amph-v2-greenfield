import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { getSessionUserId, execute, revalidatePath, redirect } = vi.hoisted(() => ({
  getSessionUserId: vi.fn<() => Promise<string | null>>(),
  execute: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn((location: string): never => {
    throw new Error(`REDIRECT:${location}`);
  }),
}));

vi.mock("@/lib/auth", () => ({ getSessionUserId }));
vi.mock("@/composition/container", () => ({
  buildContainer: () => ({ markLessonComplete: { execute } }),
}));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/navigation", () => ({ redirect }));

import { markLessonCompleteAction } from "../markLessonComplete.action";

const input = {
  courseId: "course-1",
  courseSlug: "ppc-foundations",
  lessonId: "lesson-1",
};

beforeEach(() => {
  getSessionUserId.mockReset();
  execute.mockReset();
  revalidatePath.mockReset();
  redirect.mockClear();
});

describe("markLessonCompleteAction", () => {
  it("requires authentication and preserves the lesson return path", async () => {
    getSessionUserId.mockResolvedValue(null);

    await expect(markLessonCompleteAction(input)).rejects.toThrow(
      "REDIRECT:/login?redirect=%2Fcourses%2Fppc-foundations%2Flessons%2Flesson-1",
    );
    expect(execute).not.toHaveBeenCalled();
  });

  it("uses the authenticated student identity and refreshes progress", async () => {
    getSessionUserId.mockResolvedValue("student-1");
    execute.mockResolvedValue({ ok: true, value: { progressPercent: 50 } });

    await expect(markLessonCompleteAction(input)).rejects.toThrow(
      "REDIRECT:/courses/ppc-foundations/lessons/lesson-1?completed=1",
    );
    expect(execute).toHaveBeenCalledWith({
      userId: "student-1",
      courseId: "course-1",
      lessonId: "lesson-1",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/courses/ppc-foundations");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("returns an actionable lesson error without losing context", async () => {
    getSessionUserId.mockResolvedValue("student-1");
    execute.mockResolvedValue({ ok: false, error: { kind: "enrollment_not_active" } });

    await expect(markLessonCompleteAction(input)).rejects.toThrow(
      "REDIRECT:/courses/ppc-foundations/lessons/lesson-1?completeError=enrollment_not_active",
    );
  });
});

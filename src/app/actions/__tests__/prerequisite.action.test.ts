/**
 * prerequisite.action tests (P1-01).
 *
 * Pins: the admin actor is injected, lesson blanks become null, use-case
 * errors map to plain-spoken messages, and success redirects to the
 * course prerequisites page.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { Result } from "@/domain/shared/Result";

vi.mock("server-only", () => ({}));

const { requireAdmin, setExecute, removeExecute, redirect } = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  setExecute: vi.fn(),
  removeExecute: vi.fn(),
  redirect: vi.fn((location: string): never => {
    throw new Error(`REDIRECT:${location}`);
  }),
}));

vi.mock("@/lib/auth", () => ({ requireAdmin }));
vi.mock("@/composition/container", () => ({
  buildContainer: () => ({
    setCoursePrerequisite: { execute: setExecute },
    removeCoursePrerequisite: { execute: removeExecute },
  }),
}));
vi.mock("next/navigation", () => ({ redirect }));

import {
  removePrerequisiteAction,
  setPrerequisiteAction,
} from "@/app/actions/prerequisite.action";

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    data.append(key, value);
  }
  return data;
}

beforeEach(() => {
  requireAdmin.mockReset();
  setExecute.mockReset();
  removeExecute.mockReset();
  redirect.mockClear();
  requireAdmin.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
});

describe("setPrerequisiteAction", () => {
  it("injects the admin actor, nulls a blank lesson, and redirects on success", async () => {
    setExecute.mockResolvedValue(Result.ok({ id: "prereq-1" }));

    await expect(
      setPrerequisiteAction(
        null,
        form({ courseId: "course-b", requiresCourseId: "course-a", requiresLessonId: "  " }),
      ),
    ).rejects.toThrow("REDIRECT:/admin/courses/course-b/prerequisites?saved=1");

    expect(setExecute).toHaveBeenCalledWith({
      actorId: "admin-1",
      courseId: "course-b",
      requiresCourseId: "course-a",
      requiresLessonId: null,
    });
  });

  it("maps a cycle error to a plain-spoken message", async () => {
    setExecute.mockResolvedValue(Result.err({ kind: "prerequisite_cycle" }));

    const result = await setPrerequisiteAction(
      null,
      form({ courseId: "course-a", requiresCourseId: "course-b" }),
    );

    expect(result).toEqual({
      kind: "error",
      error: "prerequisite_cycle",
      message: "That rule would create a loop. Pick a different course.",
    });
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("removePrerequisiteAction", () => {
  it("injects the admin actor and redirects on success", async () => {
    removeExecute.mockResolvedValue(Result.ok({ id: "prereq-1" }));

    await expect(
      removePrerequisiteAction(
        null,
        form({ courseId: "course-b", requiresCourseId: "course-a" }),
      ),
    ).rejects.toThrow("REDIRECT:/admin/courses/course-b/prerequisites?removed=1");

    expect(removeExecute).toHaveBeenCalledWith({
      actorId: "admin-1",
      courseId: "course-b",
      requiresCourseId: "course-a",
      requiresLessonId: null,
    });
  });

  it("maps a missing rule to a plain-spoken message", async () => {
    removeExecute.mockResolvedValue(Result.err({ kind: "prerequisite_not_found" }));

    const result = await removePrerequisiteAction(
      null,
      form({ courseId: "course-b", requiresCourseId: "course-a" }),
    );

    expect(result).toEqual({
      kind: "error",
      error: "prerequisite_not_found",
      message: "That rule is already gone.",
    });
    expect(redirect).not.toHaveBeenCalled();
  });
});

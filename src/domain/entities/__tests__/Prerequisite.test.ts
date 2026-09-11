/**
 * Prerequisite entity tests (P1-01).
 *
 * Pinned contract:
 * - blank ids are rejected with a typed error
 * - a course cannot require itself
 * - satisfaction is pure set membership: a lesson requirement checks the
 *   completed-lesson set, a course requirement checks the completed-course
 *   set
 * - course completion means every curriculum lesson id is completed
 */

import { describe, expect, it } from "vitest";
import { Result } from "@/domain/shared/Result";
import {
  createPrerequisite,
  isCourseComplete,
  isPrerequisiteSatisfied,
  type Prerequisite,
} from "@/domain/entities/Prerequisite";

function makePrerequisite(overrides: Partial<Prerequisite> = {}): Prerequisite {
  return {
    id: "prereq-1",
    courseId: "course-b",
    requiresCourseId: "course-a",
    requiresLessonId: null,
    createdAt: new Date("2026-09-11T00:00:00Z"),
    deletedAt: null,
    createdById: "admin-1",
    updatedById: "admin-1",
    ...overrides,
  };
}

describe("createPrerequisite", () => {
  it("creates a course-level prerequisite when ids are valid", () => {
    const result = createPrerequisite({
      id: "prereq-1",
      courseId: "course-b",
      requiresCourseId: "course-a",
      requiresLessonId: null,
      createdById: "admin-1",
    });

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.courseId).toBe("course-b");
      expect(result.value.requiresCourseId).toBe("course-a");
      expect(result.value.requiresLessonId).toBeNull();
      expect(result.value.deletedAt).toBeNull();
    }
  });

  it("creates a lesson-level prerequisite when requiresLessonId is set", () => {
    const result = createPrerequisite({
      id: "prereq-1",
      courseId: "course-b",
      requiresCourseId: "course-a",
      requiresLessonId: "lesson-3",
      createdById: "admin-1",
    });

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.requiresLessonId).toBe("lesson-3");
    }
  });

  it("rejects a blank courseId", () => {
    const result = createPrerequisite({
      id: "prereq-1",
      courseId: "   ",
      requiresCourseId: "course-a",
      requiresLessonId: null,
      createdById: "admin-1",
    });

    expect(result).toEqual(Result.err({ kind: "invalid_course_id" }));
  });

  it("rejects a blank requiresCourseId", () => {
    const result = createPrerequisite({
      id: "prereq-1",
      courseId: "course-b",
      requiresCourseId: "",
      requiresLessonId: null,
      createdById: "admin-1",
    });

    expect(result).toEqual(Result.err({ kind: "invalid_requires_course_id" }));
  });

  it("rejects a course that requires itself", () => {
    const result = createPrerequisite({
      id: "prereq-1",
      courseId: "course-a",
      requiresCourseId: "course-a",
      requiresLessonId: null,
      createdById: "admin-1",
    });

    expect(result).toEqual(Result.err({ kind: "self_prerequisite" }));
  });
});

describe("isPrerequisiteSatisfied", () => {
  it("returns true for a course requirement when the course is complete", () => {
    const prereq = makePrerequisite();

    expect(
      isPrerequisiteSatisfied(prereq, new Set(["course-a"]), new Set()),
    ).toBe(true);
  });

  it("returns false for a course requirement when the course is incomplete", () => {
    const prereq = makePrerequisite();

    expect(
      isPrerequisiteSatisfied(prereq, new Set(["other-course"]), new Set()),
    ).toBe(false);
  });

  it("checks the lesson set when requiresLessonId is set", () => {
    const prereq = makePrerequisite({ requiresLessonId: "lesson-3" });

    expect(
      isPrerequisiteSatisfied(prereq, new Set(["course-a"]), new Set(["lesson-3"])),
    ).toBe(true);
    expect(
      isPrerequisiteSatisfied(prereq, new Set(["course-a"]), new Set(["lesson-9"])),
    ).toBe(false);
  });
});

describe("isCourseComplete", () => {
  it("returns true when every curriculum lesson is completed", () => {
    expect(isCourseComplete(["l1", "l2"], ["l1", "l2", "l9"])).toBe(true);
  });

  it("returns false when any curriculum lesson is missing", () => {
    expect(isCourseComplete(["l1", "l2"], ["l1"])).toBe(false);
  });

  it("returns false for an empty curriculum", () => {
    expect(isCourseComplete([], [])).toBe(false);
  });
});

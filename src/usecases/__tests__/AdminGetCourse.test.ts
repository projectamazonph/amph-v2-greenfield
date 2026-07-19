/**
 * AdminGetCourse.test.ts — STORY-048a.
 *
 * Tier B coverage for the AdminGetCourse use case.
 * Covers: happy path (any status), not found, db_error.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { AdminGetCourse } from "@/usecases/AdminGetCourse";
import { InMemoryCourseRepository } from "@/infra/repositories/InMemoryCourseRepository";
import { createCourse, type Course } from "@/domain/entities/Course";

function makeCourse(overrides: Partial<Course> = {}): Course {
  const r = createCourse({
    id: "course_01",
    slug: "test-course",
    title: "Test Course",
    tagline: "Tagline",
    description: "Description",
    priceMinor: 1000,
    curriculum: {
      sections: [
        { id: "s1", title: "Section 1", lessons: [{ id: "l1", title: "Lesson 1", type: "TEXT", content: "" }] },
      ],
    },
    ...overrides,
  });
  if (!r.ok) throw new Error("seed failed");
  return r.value;
}

describe("AdminGetCourse", () => {
  let courseRepo: InMemoryCourseRepository;
  let useCase: AdminGetCourse;

  beforeEach(() => {
    courseRepo = new InMemoryCourseRepository();
    useCase = new AdminGetCourse({ courseRepo });
  });

  it("returns the course on the happy path (DRAFT)", async () => {
    await courseRepo.create(makeCourse({ status: "DRAFT" }));

    const result = await useCase.execute({ courseId: "course_01" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.course.id).toBe("course_01");
    expect(result.value.course.status).toBe("DRAFT");
  });

  it("returns ARCHIVED courses (admin view shows all statuses)", async () => {
    await courseRepo.create(makeCourse({ status: "ARCHIVED" }));

    const result = await useCase.execute({ courseId: "course_01" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.course.status).toBe("ARCHIVED");
  });

  it("returns course_not_found when the course does not exist", async () => {
    const result = await useCase.execute({ courseId: "missing" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("course_not_found");
  });

  it("returns db_error when the repo errors", async () => {
    const repo = new InMemoryCourseRepository();
    repo.findById = async () => ({
      ok: false,
      error: { kind: "db_error", message: "find failed" },
    });
    useCase = new AdminGetCourse({ courseRepo: repo });

    const result = await useCase.execute({ courseId: "course_01" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
    if (result.error.kind !== "db_error") return;
    expect(result.error.message).toBe("find failed");
  });
});

/**
 * ArchiveCourse.test.ts — STORY-048a.
 *
 * Tier B coverage for the ArchiveCourse use case.
 * Covers: happy path, course not found, idempotent on already-archived,
 * db_error propagation.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ArchiveCourse } from "@/usecases/ArchiveCourse";
import { InMemoryCourseRepository } from "@/infra/repositories/InMemoryCourseRepository";
import { createCourse, type Course } from "@/domain/entities/Course";
import { Result } from "@/domain/shared/Result";

// ── Fixtures ───────────────────────────────────────────────────────────────

function makeCourse(overrides: Partial<Course> = {}): Course {
  const result = createCourse({
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
  if (!result.ok) throw new Error("seed failed");
  return result.value;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("ArchiveCourse", () => {
  let courseRepo: InMemoryCourseRepository;
  let useCase: ArchiveCourse;

  beforeEach(() => {
    courseRepo = new InMemoryCourseRepository();
    useCase = new ArchiveCourse({ courseRepo });
  });

  it("archives a DRAFT course on the happy path", async () => {
    await courseRepo.create(makeCourse({ status: "DRAFT" }));

    const result = await useCase.execute({ courseId: "course_01" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.course.status).toBe("ARCHIVED");
    expect(result.value.wasAlreadyArchived).toBe(false);
  });

  it("archives a PUBLISHED course on the happy path", async () => {
    await courseRepo.create(makeCourse({ status: "PUBLISHED" }));

    const result = await useCase.execute({ courseId: "course_01" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.course.status).toBe("ARCHIVED");
    expect(result.value.wasAlreadyArchived).toBe(false);
  });

  it("is idempotent on an already-ARCHIVED course (returns wasAlreadyArchived=true)", async () => {
    await courseRepo.create(makeCourse({ status: "ARCHIVED" }));

    const result = await useCase.execute({ courseId: "course_01" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.wasAlreadyArchived).toBe(true);
    expect(result.value.course.status).toBe("ARCHIVED");
  });

  it("returns course_not_found when the course does not exist", async () => {
    const result = await useCase.execute({ courseId: "missing" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("course_not_found");
  });

  it("persists the archived status in the repo", async () => {
    await courseRepo.create(makeCourse({ status: "PUBLISHED" }));

    await useCase.execute({ courseId: "course_01" });

    const persisted = await courseRepo.findById("course_01");
    expect(persisted.ok).toBe(true);
    if (!persisted.ok) return;
    expect(persisted.value.status).toBe("ARCHIVED");
  });

  it("returns db_error when the repo errors", async () => {
    const repo = new InMemoryCourseRepository();
    // Seed the course so findById succeeds
    await repo.create(makeCourse());
    // Then make archive fail
    repo.archive = async () => ({
      ok: false,
      error: { kind: "db_error", message: "simulated" },
    });
    useCase = new ArchiveCourse({ courseRepo: repo });

    const result = await useCase.execute({ courseId: "course_01" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
    if (result.error.kind !== "db_error") return;
    expect(result.error.message).toBe("simulated");
  });

  it("returns db_error when the findById step errors", async () => {
    const repo = new InMemoryCourseRepository();
    repo.findById = async () => ({
      ok: false,
      error: { kind: "db_error", message: "find failed" },
    });
    useCase = new ArchiveCourse({ courseRepo: repo });

    const result = await useCase.execute({ courseId: "course_01" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
    if (result.error.kind !== "db_error") return;
    expect(result.error.message).toBe("find failed");
  });
});

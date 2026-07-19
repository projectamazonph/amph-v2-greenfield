/**
 * UpdateCourse.test.ts — STORY-048a.
 *
 * Tier B coverage for the UpdateCourse use case.
 * Covers: happy path (partial updates), course_not_found, slug_taken,
 * invalid_slug, invalid_price, db_error.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { UpdateCourse } from "@/usecases/UpdateCourse";
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
    curriculum: { sections: [{ id: "s1", title: "Section 1", lessons: [{ id: "l1", title: "Lesson 1", type: "TEXT", content: "" }] }] },
    ...overrides,
  });
  if (!r.ok) throw new Error("seed failed");
  return r.value;
}

describe("UpdateCourse", () => {
  let courseRepo: InMemoryCourseRepository;
  let useCase: UpdateCourse;

  beforeEach(() => {
    courseRepo = new InMemoryCourseRepository();
    useCase = new UpdateCourse({ courseRepo });
  });

  it("updates a course on the happy path (title only)", async () => {
    await courseRepo.create(makeCourse());

    const result = await useCase.execute({
      courseId: "course_01",
      patch: { title: "Updated Title" },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.course.title).toBe("Updated Title");
    // Other fields unchanged
    expect(result.value.course.slug).toBe("test-course");
    expect(result.value.course.tagline).toBe("Tagline");
  });

  it("updates multiple fields at once", async () => {
    await courseRepo.create(makeCourse());

    const result = await useCase.execute({
      courseId: "course_01",
      patch: { title: "New Title", priceMinor: 2000, isFeatured: true },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.course.title).toBe("New Title");
    expect(result.value.course.price.minor).toBe(2000);
    expect(result.value.course.isFeatured).toBe(true);
  });

  it("allows changing the slug if no other course has it", async () => {
    await courseRepo.create(makeCourse());

    const result = await useCase.execute({
      courseId: "course_01",
      patch: { slug: "new-slug" },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.course.slug).toBe("new-slug");
  });

  it("allows keeping the same slug (no false collision)", async () => {
    await courseRepo.create(makeCourse());

    const result = await useCase.execute({
      courseId: "course_01",
      patch: { slug: "test-course", title: "Updated" },
    });

    expect(result.ok).toBe(true);
  });

  it("returns course_not_found when the course does not exist", async () => {
    const result = await useCase.execute({
      courseId: "missing",
      patch: { title: "X" },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("course_not_found");
  });

  it("returns slug_taken when the new slug collides with another course", async () => {
    await courseRepo.create(makeCourse({ id: "c1", slug: "slug-a" }));
    await courseRepo.create(makeCourse({ id: "c2", slug: "slug-b" }));

    const result = await useCase.execute({
      courseId: "c1",
      patch: { slug: "slug-b" },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("slug_taken");
  });

  it("returns invalid_slug when the new slug is malformed", async () => {
    await courseRepo.create(makeCourse());

    const result = await useCase.execute({
      courseId: "course_01",
      patch: { slug: "Has Spaces" },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("invalid_slug");
  });

  it("returns invalid_price when the new price is negative", async () => {
    await courseRepo.create(makeCourse());

    const result = await useCase.execute({
      courseId: "course_01",
      patch: { priceMinor: -100 },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("invalid_price");
  });

  it("returns db_error when the repo errors on findById", async () => {
    const repo = new InMemoryCourseRepository();
    repo.findById = async () => ({
      ok: false,
      error: { kind: "db_error", message: "find failed" },
    });
    useCase = new UpdateCourse({ courseRepo: repo });

    const result = await useCase.execute({
      courseId: "course_01",
      patch: { title: "X" },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });

  it("returns db_error when the repo errors on update", async () => {
    const repo = new InMemoryCourseRepository();
    await repo.create(makeCourse());
    repo.update = async () => ({
      ok: false,
      error: { kind: "db_error", message: "update failed" },
    });
    useCase = new UpdateCourse({ courseRepo: repo });

    const result = await useCase.execute({
      courseId: "course_01",
      patch: { title: "X" },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });

  it("persists the updated course in the repo", async () => {
    await courseRepo.create(makeCourse());
    await useCase.execute({
      courseId: "course_01",
      patch: { title: "Persisted" },
    });

    const persisted = await courseRepo.findById("course_01");
    expect(persisted.ok).toBe(true);
    if (!persisted.ok) return;
    expect(persisted.value.title).toBe("Persisted");
  });
});

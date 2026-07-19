/**
 * CreateCourse.test.ts — STORY-048a.
 *
 * Tier B coverage for the CreateCourse use case.
 * Covers: happy path, default curriculum shape (1 section + 1 lesson),
 * invalid_slug, invalid_price, slug_taken, db_error.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { CreateCourse, type CreateCourseInput } from "@/usecases/CreateCourse";
import { InMemoryCourseRepository } from "@/infra/repositories/InMemoryCourseRepository";
import { createCourse, type Course } from "@/domain/entities/Course";

function makeInput(overrides: Partial<CreateCourseInput> = {}) {
  return {
    id: "course_new",
    slug: "new-course",
    title: "New Course",
    tagline: "Tagline",
    description: "Description",
    priceMinor: 5000,
    courseTier: "STARTER" as const,
    previewLessonCount: 1,
    isFeatured: false,
    displayOrder: 0,
    coverImage: null,
    status: "DRAFT" as const,
    defaultCurriculum: { sectionTitle: "Getting Started", lessonTitle: "Welcome" },
    ...overrides,
  };
}

function makeExistingCourse(): Course {
  const r = createCourse({
    id: "course_existing",
    slug: "existing",
    title: "Existing",
    tagline: "T",
    description: "D",
    priceMinor: 1000,
    curriculum: { sections: [{ id: "s1", title: "S", lessons: [{ id: "l1", title: "L", type: "TEXT", content: "" }] }] },
  });
  if (!r.ok) throw new Error("seed failed");
  return r.value;
}

describe("CreateCourse", () => {
  let courseRepo: InMemoryCourseRepository;
  let useCase: CreateCourse;

  beforeEach(() => {
    courseRepo = new InMemoryCourseRepository();
    useCase = new CreateCourse({ courseRepo });
  });

  it("creates a course on the happy path with the default curriculum", async () => {
    const result = await useCase.execute(makeInput());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.course.id).toBe("course_new");
    expect(result.value.course.slug).toBe("new-course");
    expect(result.value.course.title).toBe("New Course");
    expect(result.value.course.status).toBe("DRAFT");
    // Default curriculum: 1 section + 1 lesson, with the admin's titles
    expect(result.value.course.curriculum.sections.length).toBe(1);
    expect(result.value.course.curriculum.sections[0]?.title).toBe("Getting Started");
    expect(result.value.course.curriculum.sections[0]?.lessons.length).toBe(1);
    expect(result.value.course.curriculum.sections[0]?.lessons[0]?.title).toBe("Welcome");
    expect(result.value.course.curriculum.sections[0]?.lessons[0]?.type).toBe("TEXT");
  });

  it("persists the course in the repo", async () => {
    await useCase.execute(makeInput());

    const persisted = await courseRepo.findById("course_new");
    expect(persisted.ok).toBe(true);
  });

  it("returns invalid_slug when the slug is malformed", async () => {
    const result = await useCase.execute(makeInput({ slug: "Has Spaces" }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("invalid_slug");
  });

  it("returns invalid_slug when the slug has uppercase letters", async () => {
    const result = await useCase.execute(makeInput({ slug: "Has-Uppercase" }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("invalid_slug");
  });

  it("returns invalid_price when priceMinor is negative", async () => {
    const result = await useCase.execute(makeInput({ priceMinor: -100 }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("invalid_price");
  });

  it("returns slug_taken when a course with the same slug already exists", async () => {
    await courseRepo.create(makeExistingCourse());

    const result = await useCase.execute(makeInput({ slug: "existing" }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("slug_taken");
  });

  it("returns slug_taken even when the existing course is ARCHIVED", async () => {
    const existing = makeExistingCourse();
    await courseRepo.create({ ...existing, status: "ARCHIVED" });

    const result = await useCase.execute(makeInput({ slug: "existing" }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("slug_taken");
  });

  it("returns db_error when the repo fails to create", async () => {
    const repo = new InMemoryCourseRepository();
    repo.create = async () => ({
      ok: false,
      error: { kind: "db_error", message: "create failed" },
    });
    useCase = new CreateCourse({ courseRepo: repo });

    const result = await useCase.execute(makeInput());

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
    if (result.error.kind !== "db_error") return;
    expect(result.error.message).toBe("create failed");
  });

  it("creates a PUBLISHED course when status=PUBLISHED is provided", async () => {
    const result = await useCase.execute(makeInput({ status: "PUBLISHED" }));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.course.status).toBe("PUBLISHED");
  });
});

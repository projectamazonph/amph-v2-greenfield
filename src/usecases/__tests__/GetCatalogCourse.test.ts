/**
 * Tests for GetCatalogCourse.
 *
 * STORY-014. Uses InMemoryCourseRepository + InMemoryModuleRepository +
 * InMemoryLessonRepository to test the use case in isolation.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { GetCatalogCourse } from "@/usecases/GetCatalogCourse";
import { InMemoryCourseRepository } from "@/infra/repositories/InMemoryCourseRepository";
import { InMemoryModuleRepository } from "@/infra/repositories/InMemoryModuleRepository";
import { InMemoryLessonRepository } from "@/infra/repositories/InMemoryLessonRepository";
import { createCourse } from "@/domain/entities/Course";
import { createModule } from "@/domain/entities/Module";
import { createLesson } from "@/domain/entities/Lesson";
import { Result } from "@/domain/shared/Result";
import type { Course } from "@/domain/entities/Course";
import type { Module } from "@/domain/entities/Module";
import type { Lesson } from "@/domain/entities/Lesson";

// ── Test data factories ───────────────────────────────────────────────────────

function makeCourse(
  overrides: Partial<{
    id: string;
    slug: string;
    title: string;
    tagline: string;
    description: string;
    priceMinor: number;
    coverImage: string | null;
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  }> = {},
): Course {
  // createCourse requires a non-empty curriculum (at least one section with at least one lesson)
  const result = createCourse({
    id: overrides.id ?? "test-course-id",
    slug: overrides.slug ?? "test-slug",
    title: overrides.title ?? "Test Course",
    tagline: overrides.tagline ?? "",
    description: overrides.description ?? "A test course.",
    priceMinor: overrides.priceMinor ?? 0,
    coverImage: overrides.coverImage ?? null,
    curriculum: {
      sections: [
        {
          id: "seed-section-1",
          title: "Introduction",
          lessons: [
            { id: "seed-lesson-1", title: "Welcome", type: "TEXT", content: { body: "Welcome!" } },
          ],
        },
      ],
    },
    status: overrides.status ?? "PUBLISHED",
  });
  if (!result.ok) throw new Error(`Test setup error: createCourse failed: ${result.error.kind}`);
  return result.value;
}

function makeModule(
  overrides: Partial<{
    id: string;
    courseId: string;
    title: string;
    displayOrder: number;
  }> = {},
): Module {
  const result = createModule({
    id: overrides.id ?? "test-module-id",
    courseId: overrides.courseId ?? "test-course-id",
    title: overrides.title ?? "Test Module",
    displayOrder: overrides.displayOrder ?? 1,
  });
  if (!result.ok) throw new Error(`Test setup error: createModule failed: ${result.error.kind}`);
  return result.value;
}

function makeLesson(
  overrides: Partial<{
    id: string;
    moduleId: string;
    title: string;
    type: "VIDEO" | "TEXT" | "QUIZ";
    durationMinutes?: number;
    displayOrder: number;
  }> = {},
): Lesson {
  const type = overrides.type ?? "VIDEO";
  const result = createLesson({
    id: overrides.id ?? "test-lesson-id",
    moduleId: overrides.moduleId ?? "test-module-id",
    title: overrides.title ?? "Test Lesson",
    type,
    content:
      type === "VIDEO"
        ? { durationMinutes: overrides.durationMinutes ?? 5 }
        : type === "TEXT"
          ? { body: "Sample body text." }
          : {
              questions: [{ id: "q1", prompt: "Q1?", options: ["A", "B"], correctOptionIndex: 0 }],
            },
    displayOrder: overrides.displayOrder ?? 1,
  });
  if (!result.ok) throw new Error(`Test setup error: createLesson failed: ${result.error.kind}`);
  return result.value;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GetCatalogCourse", () => {
  let courseRepo: InMemoryCourseRepository;
  let moduleRepo: InMemoryModuleRepository;
  let lessonRepo: InMemoryLessonRepository;
  let useCase: GetCatalogCourse;

  beforeEach(() => {
    courseRepo = new InMemoryCourseRepository();
    moduleRepo = new InMemoryModuleRepository();
    lessonRepo = new InMemoryLessonRepository();
    useCase = new GetCatalogCourse({ courseRepo, moduleRepo, lessonRepo });
  });

  // ── Happy path ─────────────────────────────────────────────────────────────

  it("returns course detail with modules and lessons", async () => {
    const course = makeCourse({
      id: "cd-course-1",
      slug: "ppc-foundations",
      title: "PPC Foundations",
      tagline: "Master Amazon PPC",
      description: "A comprehensive course on Amazon PPC advertising.",
      priceMinor: 499900,
      coverImage: "https://example.com/cover.png",
    });
    courseRepo.seed([course]);

    const mod1 = makeModule({ id: "cd-mod-1", courseId: "cd-course-1", title: "Getting Started" });
    const mod2 = makeModule({ id: "cd-mod-2", courseId: "cd-course-1", title: "Advanced Topics" });
    await moduleRepo.create(mod1);
    await moduleRepo.create(mod2);

    const lesson1 = makeLesson({
      id: "cd-l1",
      moduleId: "cd-mod-1",
      title: "Welcome",
      type: "VIDEO",
      durationMinutes: 5,
      displayOrder: 1,
    });
    const lesson2 = makeLesson({
      id: "cd-l2",
      moduleId: "cd-mod-1",
      title: "Overview",
      type: "TEXT",
      displayOrder: 2,
    });
    const lesson3 = makeLesson({
      id: "cd-l3",
      moduleId: "cd-mod-2",
      title: "Bid Strategies",
      type: "VIDEO",
      durationMinutes: 12,
      displayOrder: 1,
    });
    await lessonRepo.create(lesson1);
    await lessonRepo.create(lesson2);
    await lessonRepo.create(lesson3);

    const result = await useCase.execute("ppc-foundations");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const detail = result.value;
    expect(detail.courseId).toBe("cd-course-1");
    expect(detail.slug).toBe("ppc-foundations");
    expect(detail.title).toBe("PPC Foundations");
    expect(detail.tagline).toBe("Master Amazon PPC");
    expect(detail.priceMinor).toBe(499900);
    expect(detail.coverImage).toBe("https://example.com/cover.png");
    expect(detail.totalLessonCount).toBe(3);
    expect(detail.totalEstimatedMinutes).toBe(17); // 5 + 12 (only VIDEO)
    expect(detail.modules).toHaveLength(2);

    // Module 1
    expect(detail.modules[0]!.title).toBe("Getting Started");
    expect(detail.modules[0]!.lessons).toHaveLength(2);
    expect(detail.modules[0]!.lessons[0]!.title).toBe("Welcome");
    expect(detail.modules[0]!.lessons[0]!.type).toBe("VIDEO");
    expect(detail.modules[0]!.lessons[0]!.estimatedMinutes).toBe(5);
    expect(detail.modules[0]!.lessons[1]!.title).toBe("Overview");
    expect(detail.modules[0]!.lessons[1]!.type).toBe("TEXT");
    expect(detail.modules[0]!.lessons[1]!.estimatedMinutes).toBe(0);

    // Module 2
    expect(detail.modules[1]!.title).toBe("Advanced Topics");
    expect(detail.modules[1]!.lessons).toHaveLength(1);
    expect(detail.modules[1]!.lessons[0]!.title).toBe("Bid Strategies");
    expect(detail.modules[1]!.lessons[0]!.estimatedMinutes).toBe(12);
  });

  // ── Not found ───────────────────────────────────────────────────────────────

  it("returns not_found when course slug does not exist", async () => {
    const result = await useCase.execute("non-existent-slug");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("not_found");
  });

  it("returns not_found when course is DRAFT (not published)", async () => {
    const draft = makeCourse({
      id: "draft-cd",
      slug: "draft-slug",
      title: "Draft Course",
      status: "DRAFT",
    });
    courseRepo.seed([draft]);

    const result = await useCase.execute("draft-slug");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("not_found");
  });

  it("returns not_found when course is ARCHIVED", async () => {
    const archived = makeCourse({
      id: "archived-cd",
      slug: "archived-slug",
      title: "Archived Course",
      status: "ARCHIVED",
    });
    courseRepo.seed([archived]);

    const result = await useCase.execute("archived-slug");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("not_found");
  });

  it("returns not_found for empty slug", async () => {
    const result = await useCase.execute("");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("not_found");
  });

  // ── Error propagation ───────────────────────────────────────────────────────

  it("returns db_error when course repo fails", async () => {
    const stubRepo = Object.assign({}, courseRepo, {
      findBySlug: async () => Result.err({ kind: "db_error", message: "Connection refused" }),
    });

    const stubUseCase = new GetCatalogCourse({
      courseRepo: stubRepo as InMemoryCourseRepository,
      moduleRepo,
      lessonRepo,
    });

    const result = await stubUseCase.execute("some-slug");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
    expect((result.error as { message: string }).message).toBe("Connection refused");
  });

  it("returns db_error when module repo fails", async () => {
    const course = makeCourse({ id: "mod-err-cd", slug: "mod-err", title: "Mod Error Course" });
    courseRepo.seed([course]);

    const stubModuleRepo = Object.assign({}, moduleRepo, {
      findByCourseId: async () => Result.err({ kind: "db_error", message: "Module DB error" }),
    });

    const stubUseCase = new GetCatalogCourse({
      courseRepo,
      moduleRepo: stubModuleRepo as InMemoryModuleRepository,
      lessonRepo,
    });

    const result = await stubUseCase.execute("mod-err");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
    expect((result.error as { message: string }).message).toBe("Module DB error");
  });

  it("returns db_error when lesson repo fails", async () => {
    const course = makeCourse({
      id: "lesson-err-cd",
      slug: "lesson-err",
      title: "Lesson Error Course",
    });
    courseRepo.seed([course]);

    const mod = makeModule({
      id: "lesson-err-mod-cd",
      courseId: "lesson-err-cd",
      title: "Test Module",
    });
    await moduleRepo.create(mod);

    const stubLessonRepo = Object.assign({}, lessonRepo, {
      findByModuleId: async () => Result.err({ kind: "db_error", message: "Lesson DB error" }),
    });

    const stubUseCase = new GetCatalogCourse({
      courseRepo,
      moduleRepo,
      lessonRepo: stubLessonRepo as InMemoryLessonRepository,
    });

    const result = await stubUseCase.execute("lesson-err");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
    expect((result.error as { message: string }).message).toBe("Lesson DB error");
  });

  // ── Edge cases ──────────────────────────────────────────────────────────────

  it("handles module with no lessons gracefully", async () => {
    const course = makeCourse({
      id: "empty-lessons-cd",
      slug: "empty-lessons",
      title: "Empty Lessons Course",
    });
    courseRepo.seed([course]);

    const mod = makeModule({
      id: "empty-lesson-mod-cd",
      courseId: "empty-lessons-cd",
      title: "Lonely Module",
    });
    await moduleRepo.create(mod);

    const result = await useCase.execute("empty-lessons");
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.totalLessonCount).toBe(0);
    expect(result.value.totalEstimatedMinutes).toBe(0);
    expect(result.value.modules).toHaveLength(1);
    expect(result.value.modules[0]!.lessons).toHaveLength(0);
  });

  it("returns course with null coverImage", async () => {
    const course = makeCourse({
      id: "no-image-cd",
      slug: "no-image",
      title: "No Image Course",
      coverImage: null,
    });
    courseRepo.seed([course]);

    const result = await useCase.execute("no-image");
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.coverImage).toBeNull();
    expect(result.value.totalLessonCount).toBe(0);
    expect(result.value.modules).toHaveLength(0);
  });

  it("returns correct priceMinor from course price", async () => {
    const course = makeCourse({
      id: "php-cd",
      slug: "php-course",
      title: "PHP Course",
      priceMinor: 9900,
    });
    courseRepo.seed([course]);

    const result = await useCase.execute("php-course");
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.priceMinor).toBe(9900);
  });
});

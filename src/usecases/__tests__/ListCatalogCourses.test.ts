/**
 * Tests for ListCatalogCourses.
 *
 * STORY-014. Uses InMemoryCourseRepository + InMemoryModuleRepository +
 * InMemoryLessonRepository to test the use case in isolation.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ListCatalogCourses } from "@/usecases/ListCatalogCourses";
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
//
// All test data uses values that pass factory validation so .value is always
// defined. Unwrapping with `!` is safe here — if it fails, the test setup is
// wrong, not the factory.

function makeCourse(
  overrides: Partial<{
    id: string;
    slug: string;
    title: string;
    tagline: string;
    description: string;
    priceMinor: number;
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  }> = {},
): Course {
  // createCourse requires a non-empty curriculum (at least one section with at least one lesson)
  const result = createCourse({
    id: overrides.id ?? "test-course-id",
    slug: overrides.slug ?? "test-course",
    title: overrides.title ?? "Test Course",
    tagline: overrides.tagline ?? "",
    description: overrides.description ?? "A test course.",
    priceMinor: overrides.priceMinor ?? 0,
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

describe("ListCatalogCourses", () => {
  let courseRepo: InMemoryCourseRepository;
  let moduleRepo: InMemoryModuleRepository;
  let lessonRepo: InMemoryLessonRepository;
  let useCase: ListCatalogCourses;

  beforeEach(() => {
    courseRepo = new InMemoryCourseRepository();
    moduleRepo = new InMemoryModuleRepository();
    lessonRepo = new InMemoryLessonRepository();
    useCase = new ListCatalogCourses({ courseRepo, moduleRepo, lessonRepo });
  });

  // ── Happy path ─────────────────────────────────────────────────────────────

  it("returns published courses enriched with module metadata", async () => {
    const course = makeCourse({
      id: "course-1",
      slug: "ppc-foundations",
      title: "PPC Foundations",
      priceMinor: 499900,
    });
    courseRepo.seed([course]);

    const mod = makeModule({ id: "mod-1", courseId: "course-1", title: "Getting Started" });
    await moduleRepo.create(mod);

    const videoLesson = makeLesson({
      id: "lesson-1",
      moduleId: "mod-1",
      title: "Welcome Video",
      type: "VIDEO",
      durationMinutes: 8,
      displayOrder: 1,
    });
    const textLesson = makeLesson({
      id: "lesson-2",
      moduleId: "mod-1",
      title: "Reading Material",
      type: "TEXT",
      displayOrder: 2,
    });
    await lessonRepo.create(videoLesson);
    await lessonRepo.create(textLesson);

    const result = await useCase.execute();

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const { courses } = result.value;
    expect(courses).toHaveLength(1);
    expect(courses[0]!.course.id).toBe("course-1");
    expect(courses[0]!.moduleCount).toBe(1);
    expect(courses[0]!.lessonCount).toBe(2);
    expect(courses[0]!.estimatedMinutes).toBe(8); // only VIDEO counts
    expect(courses[0]!.modules).toHaveLength(1);
    expect(courses[0]!.modules[0]!.title).toBe("Getting Started");
    expect(courses[0]!.modules[0]!.lessonCount).toBe(2);
    expect(courses[0]!.modules[0]!.estimatedMinutes).toBe(8);
  });

  it("returns empty list when no published courses exist", async () => {
    const result = await useCase.execute();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.courses).toHaveLength(0);
  });

  it("excludes non-PUBLISHED courses", async () => {
    const draft = makeCourse({
      id: "draft-course",
      slug: "draft-slug",
      title: "Draft Course",
      status: "DRAFT",
    });
    courseRepo.seed([draft]);

    const result = await useCase.execute();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.courses).toHaveLength(0);
  });

  it("counts video duration across multiple modules", async () => {
    const course = makeCourse({ id: "multi-mod", slug: "multi-mod", title: "Multi Module" });
    courseRepo.seed([course]);

    const mod1 = makeModule({ id: "m1", courseId: "multi-mod", title: "Mod 1" });
    const mod2 = makeModule({ id: "m2", courseId: "multi-mod", title: "Mod 2" });
    await moduleRepo.create(mod1);
    await moduleRepo.create(mod2);

    for (const mod of [mod1, mod2]) {
      for (let i = 0; i < 3; i++) {
        const l = makeLesson({
          id: `${mod.id}-l${i + 1}`,
          moduleId: mod.id,
          title: `Lesson ${i + 1}`,
          type: "VIDEO",
          durationMinutes: 5,
          displayOrder: i + 1,
        });
        await lessonRepo.create(l);
      }
    }

    const result = await useCase.execute();
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.courses[0]!.lessonCount).toBe(6);
    expect(result.value.courses[0]!.estimatedMinutes).toBe(30);
  });

  // ── Error propagation ───────────────────────────────────────────────────────

  it("returns db_error when module repo fails", async () => {
    const course = makeCourse({ id: "err-course", slug: "err-slug", title: "Error Course" });
    courseRepo.seed([course]);

    const stubModuleRepo = Object.assign({}, moduleRepo, {
      findByCourseId: async () => Result.err({ kind: "db_error", message: "Connection lost" }),
    });

    const stubUseCase = new ListCatalogCourses({
      courseRepo,
      moduleRepo: stubModuleRepo as InMemoryModuleRepository,
      lessonRepo,
    });

    const result = await stubUseCase.execute();
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
    expect((result.error as { message: string }).message).toBe("Connection lost");
  });

  it("returns db_error when lesson repo fails", async () => {
    const course = makeCourse({
      id: "lesson-err",
      slug: "lesson-err",
      title: "Lesson Error Course",
    });
    courseRepo.seed([course]);

    const mod = makeModule({ id: "lesson-err-mod", courseId: "lesson-err", title: "Test Module" });
    await moduleRepo.create(mod);

    const stubLessonRepo = Object.assign({}, lessonRepo, {
      findByModuleId: async () => Result.err({ kind: "db_error", message: "DB timeout" }),
    });

    const stubUseCase = new ListCatalogCourses({
      courseRepo,
      moduleRepo,
      lessonRepo: stubLessonRepo as InMemoryLessonRepository,
    });

    const result = await stubUseCase.execute();
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
    expect((result.error as { message: string }).message).toBe("DB timeout");
  });

  it("handles module with no lessons gracefully", async () => {
    const course = makeCourse({ id: "empty-mod", slug: "empty-mod", title: "Empty Module Course" });
    courseRepo.seed([course]);

    const mod = makeModule({ id: "empty-module", courseId: "empty-mod", title: "Empty Module" });
    await moduleRepo.create(mod);

    const result = await useCase.execute();
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.courses[0]!.lessonCount).toBe(0);
    expect(result.value.courses[0]!.estimatedMinutes).toBe(0);
    expect(result.value.courses[0]!.modules[0]!.lessonCount).toBe(0);
    expect(result.value.courses[0]!.modules[0]!.estimatedMinutes).toBe(0);
  });
});

/**
 * CreateCourse — admin creates a new course.
 *
 * STORY-048a: Admin courses CRUD.
 *
 * The admin submit form doesn't carry a full curriculum (that's
 * STORY-048b/c). Instead, the form provides:
 *   - defaultCurriculum: { sectionTitle, lessonTitle }
 * which the use case uses to build a minimal valid Curriculum
 * (1 section + 1 lesson) that satisfies the createCourse entity
 * factory's "must have at least one section with at least one lesson"
 * rule. The admin can then replace the curriculum in STORY-048b/c.
 *
 * Flow:
 *  1. Build a Curriculum from defaultCurriculum
 *  2. Call createCourse entity factory (validates slug, price, curriculum)
 *  3. Persist via courseRepo.create
 *  4. Return the course
 *
 * Errors:
 *  - invalid_slug / invalid_price — from the entity factory
 *  - slug_taken — from the repo
 *  - db_error — from the repo
 */

import { Result } from "@/domain/shared/Result";
import { createCourse, type Course, type CourseStatus, type Curriculum, type Lesson } from "@/domain/entities/Course";
import type { CourseRepository } from "@/ports/repositories/CourseRepository";
import type { CourseAccessTier } from "@/domain/values/CourseAccessTier";

// ── Input / Output types ───────────────────────────────────────────────────

export interface CreateCourseInput {
  id: string;
  actorId: string;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  priceMinor: number;
  courseTier: CourseAccessTier;
  previewLessonCount: number;
  isFeatured: boolean;
  displayOrder: number;
  coverImage: string | null;
  status: CourseStatus;
  defaultCurriculum: {
    sectionTitle: string;
    lessonTitle: string;
  };
}

export type CreateCourseError =
  | { kind: "invalid_slug" }
  | { kind: "invalid_price" }
  | { kind: "invalid_curriculum" }
  | { kind: "slug_taken" }
  | { kind: "db_error"; message: string };

export type CreateCourseResult = Result<
  { course: Course },
  CreateCourseError
>;

// ── Dependencies ───────────────────────────────────────────────────────────

import type { RecordAuditLog } from "@/usecases/RecordAuditLog";

// ── Dependencies ───────────────────────────────────────────────────────────

export interface CreateCourseDeps {
  courseRepo: CourseRepository;
  recordAuditLog: RecordAuditLog;
}

// ── Use Case ───────────────────────────────────────────────────────────────

export class CreateCourse {
  constructor(private readonly deps: CreateCourseDeps) {}

  async execute(input: CreateCourseInput): Promise<CreateCourseResult> {
    // ── 1. Build default curriculum ──────────────────────
    const lessonId = `${input.id}-lesson-1`;
    const sectionId = `${input.id}-section-1`;
    const lesson: Lesson = {
      id: lessonId,
      title: input.defaultCurriculum.lessonTitle,
      type: "TEXT",
      content: "",
    };
    const curriculum: Curriculum = {
      sections: [
        {
          id: sectionId,
          title: input.defaultCurriculum.sectionTitle,
          lessons: [lesson],
        },
      ],
    };

    // ── 2. Build the course via the entity factory ────────
    const createResult = createCourse({
      id: input.id,
      slug: input.slug,
      title: input.title,
      tagline: input.tagline,
      description: input.description,
      priceMinor: input.priceMinor,
      curriculum,
      coverImage: input.coverImage,
      isFeatured: input.isFeatured,
      displayOrder: input.displayOrder,
      status: input.status,
      courseTier: input.courseTier,
      previewLessonCount: input.previewLessonCount,
    });
    if (!createResult.ok) {
      if (createResult.error.kind === "invalid_slug") {
        return Result.err({ kind: "invalid_slug" });
      }
      if (createResult.error.kind === "invalid_price") {
        return Result.err({ kind: "invalid_price" });
      }
      if (createResult.error.kind === "invalid_curriculum") {
        return Result.err({ kind: "invalid_curriculum" });
      }
      return Result.err({ kind: "db_error", message: "Entity validation failed" });
    }
    const course = createResult.value;

    // ── 3. Persist ────────────────────────────────────────
    const persistResult = await this.deps.courseRepo.create(course);
    if (!persistResult.ok) {
      if (persistResult.error.kind === "slug_taken") {
        return Result.err({ kind: "slug_taken" });
      }
      if (persistResult.error.kind === "db_error") {
        return Result.err({ kind: "db_error", message: persistResult.error.message });
      }
      return Result.err({ kind: "db_error", message: "Failed to persist course" });
    }

    // Audit log — best-effort. RecordAuditLog swallows errors.
    await this.deps.recordAuditLog.execute({
      actorId: input.actorId,
      action: "course.created",
      targetType: "course",
      targetId: course.id,
      metadata: { title: course.title, slug: course.slug },
    });

    return Result.ok({ course: persistResult.value });
  }
}

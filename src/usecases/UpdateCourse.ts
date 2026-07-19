/**
 * UpdateCourse — admin updates an existing course.
 *
 * STORY-048a: Admin courses CRUD.
 *
 * The patch contains only the fields the admin wants to change. The
 * use case:
 *  1. Fetches the existing course
 *  2. Applies the patch via the domain's `updateCourse` entity factory
 *     (which re-validates slug, price, etc.)
 *  3. Persists via courseRepo.update (which enforces slug uniqueness)
 *  4. Returns the updated course
 *
 * Curriculum is intentionally NOT patchable here — module/lesson
 * editing is in STORY-048b/c.
 */

import { Result } from "@/domain/shared/Result";
import { updateCourse, type Course, type UpdateCoursePatch } from "@/domain/entities/Course";
import type { CourseRepository } from "@/ports/repositories/CourseRepository";

// ── Input / Output types ───────────────────────────────────────────────────

export interface UpdateCourseInput {
  courseId: string;
  patch: UpdateCoursePatch;
}

export type UpdateCourseError =
  | { kind: "course_not_found" }
  | { kind: "invalid_slug" }
  | { kind: "invalid_price" }
  | { kind: "invalid_curriculum" }
  | { kind: "slug_taken" }
  | { kind: "db_error"; message: string };

export type UpdateCourseResult = Result<
  { course: Course },
  UpdateCourseError
>;

// ── Dependencies ───────────────────────────────────────────────────────────

export interface UpdateCourseDeps {
  courseRepo: CourseRepository;
}

// ── Use Case ───────────────────────────────────────────────────────────────

export class UpdateCourse {
  constructor(private readonly deps: UpdateCourseDeps) {}

  async execute(input: UpdateCourseInput): Promise<UpdateCourseResult> {
    // ── 1. Find existing course ──────────────────────────
    const findResult = await this.deps.courseRepo.findById(input.courseId);
    if (!findResult.ok) {
      if (findResult.error.kind === "not_found") {
        return Result.err({ kind: "course_not_found" });
      }
      if (findResult.error.kind === "db_error") {
        return Result.err({ kind: "db_error", message: findResult.error.message });
      }
      return Result.err({ kind: "db_error", message: "Failed to fetch course" });
    }
    const existing = findResult.value;

    // ── 2. Apply patch via the entity factory ────────────
    const updateResult = updateCourse(existing, input.patch);
    if (!updateResult.ok) {
      if (updateResult.error.kind === "invalid_slug") {
        return Result.err({ kind: "invalid_slug" });
      }
      if (updateResult.error.kind === "invalid_price") {
        return Result.err({ kind: "invalid_price" });
      }
      if (updateResult.error.kind === "invalid_curriculum") {
        return Result.err({ kind: "invalid_curriculum" });
      }
      return Result.err({ kind: "db_error", message: "Entity validation failed" });
    }
    const updated = updateResult.value;

    // ── 3. Persist ────────────────────────────────────────
    const persistResult = await this.deps.courseRepo.update(updated);
    if (!persistResult.ok) {
      if (persistResult.error.kind === "not_found") {
        return Result.err({ kind: "course_not_found" });
      }
      if (persistResult.error.kind === "slug_taken") {
        return Result.err({ kind: "slug_taken" });
      }
      if (persistResult.error.kind === "db_error") {
        return Result.err({ kind: "db_error", message: persistResult.error.message });
      }
      return Result.err({ kind: "db_error", message: "Failed to persist update" });
    }
    return Result.ok({ course: persistResult.value });
  }
}

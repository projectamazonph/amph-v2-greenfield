/**
 * EnrollStudent use case — Story 017.
 *
 * Enrolls a student in a course. Checks:
 *  - Course exists and is published
 *  - User ID is valid
 *
 * KISS: One responsibility. Payment/upsell is a separate story (STORY-021).
 * already_enrolled guard is wired via EnrolmentRepository in STORY-030.
 */

import type { CourseRepository, CourseError } from "@/ports/repositories/CourseRepository";
import { Result } from "@/domain/shared/Result";

export type EnrollStudentError =
  | CourseError
  | { kind: "course_unpublished" }
  | { kind: "invalid_user" }
  | { kind: "db_error"; message: string };

export type EnrollStudentOutput =
  | { ok: true; enrollmentId: string; courseId: string; userId: string; enrolledAt: Date }
  | { ok: false; error: EnrollStudentError };

export class EnrollStudent {
  constructor(
    private readonly courseRepo: CourseRepository,
    private readonly enrollmentId: () => string,
  ) {}

  async execute(userId: string, courseId: string): Promise<EnrollStudentOutput> {
    if (!userId || !userId.trim()) return { ok: false, error: { kind: "invalid_user" } };

    const courseResult = await this.courseRepo.findById(courseId);
    if (Result.isErr(courseResult)) return { ok: false, error: courseResult.error };
    if (!courseResult.ok) return { ok: false, error: { kind: "not_found" } };

    if (courseResult.value.status !== "PUBLISHED") {
      return { ok: false, error: { kind: "course_unpublished" } };
    }

    // TODO: STORY-030 — check already_enrolled via EnrolmentRepository

    return {
      ok: true,
      enrollmentId: this.enrollmentId(),
      courseId,
      userId,
      enrolledAt: new Date(),
    };
  }
}

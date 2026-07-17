/**
 * GetCourse use case — Story 017.
 *
 * Fetches a single course by slug for the course detail page.
 */

import type { CourseRepository, CourseError } from "@/ports/repositories/CourseRepository";
import { Result } from "@/lib/Result";
import type { Course } from "@/domain/entities/Course";

export type GetCourseError = CourseError;

export type GetCourseOutput =
  | { ok: true; course: Course }
  | { ok: false; error: GetCourseError };

export class GetCourse {
  constructor(private readonly courseRepo: CourseRepository) {}

  async execute(slug: string): Promise<GetCourseOutput> {
    if (!slug) return { ok: false, error: { kind: "not_found" } };

    const result = await this.courseRepo.findBySlug(slug);
    if (Result.isErr(result)) return { ok: false, error: result.error };
    if (!result.ok) return { ok: false, error: { kind: "not_found" } };

    const course = result.value;

    // Only published courses are shown on the public catalog
    if (course.status !== "PUBLISHED") {
      return { ok: false, error: { kind: "not_found" } };
    }

    return { ok: true, course };
  }
}

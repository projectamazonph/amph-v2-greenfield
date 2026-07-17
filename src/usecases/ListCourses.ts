/**
 * ListCourses use case — Story 016.
 *
 * Returns all published courses for the public course catalog.
 * SRP: Only knows how to list courses. Filtering/sorting belongs here if needed.
 */

import type { CourseRepository, CourseError } from "@/ports/repositories/CourseRepository";
import { Result } from "@/lib/Result";
import type { Course } from "@/domain/entities/Course";

export type ListCoursesError = CourseError;

export type ListCoursesOutput =
  | { ok: true; courses: readonly Course[] }
  | { ok: false; error: ListCoursesError };

export class ListCourses {
  constructor(private readonly courseRepo: CourseRepository) {}

  async execute(): Promise<ListCoursesOutput> {
    const result = await this.courseRepo.listPublished();
    if (Result.isErr(result)) {
      return { ok: false, error: result.error };
    }
    return { ok: true, courses: result.value };
  }
}

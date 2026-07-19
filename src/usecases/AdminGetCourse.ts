/**
 * AdminGetCourse — fetch a single course by id (admin view).
 *
 * STORY-048a: Admin courses CRUD.
 *
 * Unlike the public-facing `GetCourse` (which only returns PUBLISHED
 * courses), this use case returns courses in ANY status, including
 * DRAFT and ARCHIVED. The admin pages need to show drafts and
 * archived courses too.
 *
 * Flow:
 *  1. Find course by id
 *  2. Return it (no status filter)
 */

import { Result } from "@/domain/shared/Result";
import type { Course } from "@/domain/entities/Course";
import type { CourseRepository } from "@/ports/repositories/CourseRepository";

export interface AdminGetCourseInput {
  courseId: string;
}

export type AdminGetCourseError =
  | { kind: "course_not_found" }
  | { kind: "db_error"; message: string };

export type AdminGetCourseResult = Result<
  { course: Course },
  AdminGetCourseError
>;

export interface AdminGetCourseDeps {
  courseRepo: CourseRepository;
}

export class AdminGetCourse {
  constructor(private readonly deps: AdminGetCourseDeps) {}

  async execute(input: AdminGetCourseInput): Promise<AdminGetCourseResult> {
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
    return Result.ok({ course: findResult.value });
  }
}

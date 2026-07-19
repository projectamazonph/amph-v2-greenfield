/**
 * AuthorizeLessonAccess — per-lesson access decision.
 *
 * P0-5 fix: the previous lesson page only differentiated "denied_*"
 * from "non-denied" decisions, so authenticated users with only preview
 * tier could read any lesson. This use case decides per-lesson:
 *
 *   - admin                       → allowed (any lesson)
 *   - active enrollment           → allowed (any lesson)
 *   - refunded/cancelled/expired  → treated as NOT enrolled
 *   - no enrollment, not admin    → allowed_preview if lesson index
 *                                   < course.previewLessonCount, else denied
 *   - anonymous (userId empty)    → same as no-enrollment
 *
 * This is the SINGLE source of truth for lesson access. The page must
 * call this use case; it must not re-implement the logic.
 */

import { Result } from "@/domain/shared/Result";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import type { CourseRepository } from "@/ports/repositories/CourseRepository";
import type { IEnrollmentRepository } from "@/ports/repositories/IEnrollmentRepository";
import type { Course } from "@/domain/entities/Course";

export type AuthorizeLessonAccessInput = {
  /** Empty string = anonymous. */
  userId: string;
  courseId: string;
  lessonId: string;
};

export type AuthorizeLessonAccessDecision =
  | { readonly kind: "allowed" }
  | { readonly kind: "allowed_preview"; readonly previewLessonCount: number }
  | { readonly kind: "denied"; readonly reason: "preview_limit" | "not_enrolled" };

export type AuthorizeLessonAccessError =
  | { kind: "course_not_found" }
  | { kind: "lesson_not_found" }
  | { kind: "user_not_found" };

export type AuthorizeLessonAccessResult = Result<
  AuthorizeLessonAccessDecision,
  AuthorizeLessonAccessError
>;

export interface AuthorizeLessonAccessDeps {
  userRepo: UserRepository;
  courseRepo: CourseRepository;
  enrollmentRepo: IEnrollmentRepository;
}

export class AuthorizeLessonAccess {
  constructor(private readonly deps: AuthorizeLessonAccessDeps) {}

  async execute(input: AuthorizeLessonAccessInput): Promise<AuthorizeLessonAccessResult> {
    // 1. Course must exist and be published.
    const courseResult = await this.deps.courseRepo.findById(input.courseId);
    if (!courseResult.ok) {
      return Result.err({ kind: "course_not_found" });
    }
    const course = courseResult.value;
    if (course.status !== "PUBLISHED") {
      return Result.err({ kind: "course_not_found" });
    }

    // 2. Lesson must exist in the curriculum.
    const lessonIndex = this.findLessonIndex(course, input.lessonId);
    if (lessonIndex === -1) {
      return Result.err({ kind: "lesson_not_found" });
    }

    // 3. Anonymous → preview window only.
    if (!input.userId) {
      return Result.ok(this.previewDecision(course, lessonIndex));
    }

    // 4. Look up the authenticated user.
    const userResult = await this.deps.userRepo.findById(input.userId);
    if (!userResult.ok) {
      return Result.err({ kind: "user_not_found" });
    }
    const user = userResult.value;

    // 5. Admin → full access.
    if (user.role === "ADMIN") {
      return Result.ok({ kind: "allowed" });
    }

    // 6. Active enrollment → full access. Refunded/cancelled/expired
    //    are treated as "not enrolled" (intentional: a refund revokes
    //    access per the audit's P1-3).
    const enrollment = await this.deps.enrollmentRepo.findByUserIdAndCourseId(
      input.userId,
      input.courseId,
    );
    if (enrollment !== null && enrollment.status === "active") {
      return Result.ok({ kind: "allowed" });
    }

    // 7. Not enrolled (or refunded) → preview window only.
    return Result.ok(this.previewDecision(course, lessonIndex));
  }

  private previewDecision(course: Course, lessonIndex: number): AuthorizeLessonAccessDecision {
    if (lessonIndex < course.previewLessonCount) {
      return {
        kind: "allowed_preview",
        previewLessonCount: course.previewLessonCount,
      };
    }
    return { kind: "denied", reason: "preview_limit" };
  }

  private findLessonIndex(course: Course, lessonId: string): number {
    let i = 0;
    for (const section of course.curriculum.sections) {
      for (const lesson of section.lessons) {
        if (lesson.id === lessonId) return i;
        i++;
      }
    }
    return -1;
  }
}

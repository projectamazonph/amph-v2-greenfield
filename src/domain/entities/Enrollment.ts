/**
 * Enrollment — a student's active enrollment in a course.
 *
 * STORY-023: EnrollStudent use case.
 *
 * Immutable domain object. Created by `createEnrollment`.
 * Status transitions (cancel, refund) handled by separate use cases.
 */

import { Result } from "@/domain/shared/Result";

export type EnrollmentStatus = "active" | "cancelled" | "refunded" | "expired";
export type EnrollmentSource = "direct" | "affiliate" | "simulator_trial";

export interface Enrollment {
  readonly id: string;
  readonly userId: string;
  readonly courseId: string;
  readonly status: EnrollmentStatus;
  readonly source: EnrollmentSource;
  readonly couponCode: string | null;
  readonly couponDiscount: number | null;
  readonly createdAt: Date;

  // ── Progress (mutable) ────────────────────────────────────
  completedLessonIds: string[];
  lastLessonId: string | null;
  progressPercent: number;

  /**
   * Mark a lesson as complete for this enrollment.
   * Idempotent: if lessonId is already in completedLessonIds, this is a no-op.
   * Updates completedLessonIds, lastLessonId, progressPercent.
   */
  markLessonComplete(lessonId: string, courseLessonCount: number): void;
}

export type CreateEnrollmentError =
  | { kind: "invalid_user_id" }
  | { kind: "invalid_course_id" };

/**
 * Factory for creating an Enrollment domain object.
 * Enrollments are always created with status "active".
 */
export function createEnrollment(params: {
  id: string;
  userId: string;
  courseId: string;
  source?: EnrollmentSource;
  couponCode?: string | null;
  couponDiscount?: number | null;
  createdAt?: Date;
}): Result<Enrollment, CreateEnrollmentError> {
  if (!params.userId.trim()) {
    return Result.err({ kind: "invalid_user_id" });
  }
  if (!params.courseId.trim()) {
    return Result.err({ kind: "invalid_course_id" });
  }

  const enrollment: Enrollment = {
    id: params.id,
    userId: params.userId,
    courseId: params.courseId,
    status: "active",
    source: params.source ?? "direct",
    couponCode: params.couponCode ?? null,
    couponDiscount: params.couponDiscount ?? null,
    createdAt: params.createdAt ?? new Date(),
    completedLessonIds: [],
    lastLessonId: null,
    progressPercent: 0,
    markLessonComplete: function (lessonId: string, courseLessonCount: number): void {
      if (!this.completedLessonIds.includes(lessonId)) {
        this.completedLessonIds.push(lessonId);
      }
      // Always update lastLessonId and progressPercent (even on re-visit)
      this.lastLessonId = lessonId;
      this.progressPercent = courseLessonCount > 0
        ? Math.min(100, Math.floor((this.completedLessonIds.length / courseLessonCount) * 100))
        : 0;
    },
  };
  return Result.ok(enrollment);
}

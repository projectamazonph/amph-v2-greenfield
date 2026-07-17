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

  return Result.ok({
    id: params.id,
    userId: params.userId,
    courseId: params.courseId,
    status: "active",
    source: params.source ?? "direct",
    couponCode: params.couponCode ?? null,
    couponDiscount: params.couponDiscount ?? null,
    createdAt: params.createdAt ?? new Date(),
  });
}

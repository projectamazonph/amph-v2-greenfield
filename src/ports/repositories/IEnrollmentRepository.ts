/**
 * IEnrollmentRepository — port for persisting and querying enrollments.
 *
 * STORY-023: EnrollStudent use case.
 *
 * ADR-014: Every port method returns Result<T, E>. No exceptions across boundaries.
 */

import type { Result } from "@/domain/shared/Result";
import type { Enrollment } from "@/domain/entities/Enrollment";

export type EnrollmentError =
  | { kind: "not_found" }
  | { kind: "already_enrolled" }
  | { kind: "db_error"; message: string };

export interface IEnrollmentRepository {
  /**
   * Find an enrollment by userId and courseId.
   * Returns null if no enrollment exists.
   */
  findByUserIdAndCourseId(
    userId: string,
    courseId: string,
  ): Promise<Enrollment | null>;

  /**
   * Find all enrollments for a user.
   */
  findByUserId(userId: string): Promise<Result<readonly Enrollment[], EnrollmentError>>;

  /**
   * Find an enrollment by its ID.
   */
  findById(id: string): Promise<Result<Enrollment, EnrollmentError>>;

  /**
   * Persist a new enrollment.
   * Returns already_enrolled if a record for (userId, courseId) already exists.
   */
  create(enrollment: Enrollment): Promise<Result<Enrollment, EnrollmentError>>;

  /**
   * Update an existing enrollment (e.g. progress fields).
   * STORY-027: MarkLessonComplete uses this to persist completedLessonIds, etc.
   */
  update(enrollment: Enrollment): Promise<Result<Enrollment, EnrollmentError>>;
}

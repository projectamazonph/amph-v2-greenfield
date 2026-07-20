/**
 * InMemoryEnrollmentRepository — fast, synchronous test adapter for IEnrollmentRepository.
 *
 * STORY-023: EnrollStudent use case.
 */

import type {
  IEnrollmentRepository,
  EnrollmentError,
} from "@/ports/repositories/IEnrollmentRepository";
import type { Enrollment } from "@/domain/entities/Enrollment";
import { Result } from "@/domain/shared/Result";

export class InMemoryEnrollmentRepository implements IEnrollmentRepository {
  private enrollments = new Map<string, Enrollment>(); // id → enrollment
  private userCourseIndex = new Map<string, string>(); // `${userId}:${courseId}` → id

  async findByUserIdAndCourseId(
    userId: string,
    courseId: string,
  ): Promise<Enrollment | null> {
    const key = `${userId}:${courseId}`;
    const id = this.userCourseIndex.get(key);
    if (!id) return null;
    return this.enrollments.get(id) ?? null;
  }

  async findById(id: string): Promise<Result<Enrollment, EnrollmentError>> {
    const e = this.enrollments.get(id);
    if (!e) return Result.err({ kind: "not_found" });
    return Result.ok(e);
  }

  async findByUserId(
    userId: string,
  ): Promise<Result<readonly Enrollment[], EnrollmentError>> {
    const all = Array.from(this.enrollments.values()).filter(
      (e) => e.userId === userId,
    );
    return Result.ok(all);
  }

  async findByCourseId(
    courseId: string,
  ): Promise<Result<readonly Enrollment[], EnrollmentError>> {
    const all = Array.from(this.enrollments.values()).filter(
      (e) => e.courseId === courseId,
    );
    return Result.ok(all);
  }

  async create(enrollment: Enrollment): Promise<Result<Enrollment, EnrollmentError>> {
    const key = `${enrollment.userId}:${enrollment.courseId}`;
    if (this.userCourseIndex.has(key)) {
      return Result.err({ kind: "already_enrolled" });
    }
    this.enrollments.set(enrollment.id, Object.freeze({ ...enrollment }));
    this.userCourseIndex.set(key, enrollment.id);
    return Result.ok(enrollment);
  }

  async update(enrollment: Enrollment): Promise<Result<Enrollment, EnrollmentError>> {
    if (!this.enrollments.has(enrollment.id)) {
      return Result.err({ kind: "not_found" });
    }
    // Store as mutable copy so callers can mutate progress fields
    const updated: Enrollment = { ...enrollment };
    this.enrollments.set(enrollment.id, updated);
    return Result.ok(updated);
  }

  /** Remove all enrollments. Call between tests. */
  clear(): void {
    this.enrollments.clear();
    this.userCourseIndex.clear();
  }
}

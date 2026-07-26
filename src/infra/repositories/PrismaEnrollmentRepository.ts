/**
 * PrismaEnrollmentRepository — production adapter for IEnrollmentRepository.
 *
 * STORY-023: EnrollStudent use case.
 */

import { PrismaClient } from "@prisma/client";
import { Result } from "@/domain/shared/Result";
import type {
  IEnrollmentRepository,
  EnrollmentError,
} from "@/ports/repositories/IEnrollmentRepository";
import type { Enrollment } from "@/domain/entities/Enrollment";
import { isEnrollmentStatus } from "@/domain/entities/Enrollment";

export class PrismaEnrollmentRepository implements IEnrollmentRepository {
  constructor(private readonly db: PrismaClient) {}

  async findByUserIdAndCourseId(userId: string, courseId: string): Promise<Enrollment | null> {
    const row = await this.db.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (!row) return null;
    try {
      return this.mapRow(row);
    } catch (err: unknown) {
      // This method has no Result error channel. A corrupt/legacy status
      // must fail closed (treated as "no enrollment") rather than throw
      // uncaught into access-control call sites (AuthorizeLessonAccess,
      // MarkLessonComplete, EnrollStudent, IssueCertificate).
      console.error("[PrismaEnrollmentRepository] corrupt enrollment row:", err);
      return null;
    }
  }

  async findById(id: string): Promise<Result<Enrollment, EnrollmentError>> {
    try {
      const row = await this.db.enrollment.findUnique({ where: { id } });
      if (!row) return Result.err({ kind: "not_found" });
      return Result.ok(this.mapRow(row));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async findByUserId(userId: string): Promise<Result<readonly Enrollment[], EnrollmentError>> {
    try {
      const rows = await this.db.enrollment.findMany({ where: { userId } });
      return Result.ok(rows.map((r) => this.mapRow(r)));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async findByCourseId(courseId: string): Promise<Result<readonly Enrollment[], EnrollmentError>> {
    try {
      const rows = await this.db.enrollment.findMany({ where: { courseId } });
      return Result.ok(rows.map((r) => this.mapRow(r)));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async create(enrollment: Enrollment): Promise<Result<Enrollment, EnrollmentError>> {
    try {
      const row = await this.db.enrollment.create({
        data: {
          id: enrollment.id,
          userId: enrollment.userId,
          courseId: enrollment.courseId,
          status: enrollment.status,
          source: enrollment.source,
          couponCode: enrollment.couponCode,
          couponDiscount: enrollment.couponDiscount,
        },
      });
      return Result.ok(this.mapRow(row));
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code: string }).code === "P2002"
      ) {
        // Unique constraint violation — already enrolled
        return Result.err({ kind: "already_enrolled" });
      }
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  private mapRow(row: {
    id: string;
    userId: string;
    courseId: string;
    status: string;
    source: string;
    couponCode: string | null;
    couponDiscount: number | null;
    createdAt: Date;
    completedLessonIds: string[];
    lastLessonId: string | null;
    progressPercent: number;
  }): Enrollment {
    if (!isEnrollmentStatus(row.status)) {
      // Caught by callers with a Result error channel and turned into a
      // db_error; findByUserIdAndCourseId (no Result channel) catches
      // this separately and fails closed. A corrupt or legacy status
      // value must not silently hydrate an Enrollment that bypasses
      // access-control checks keyed on status.
      throw new Error(`Enrollment ${row.id} has an invalid persisted status: "${row.status}"`);
    }
    return {
      id: row.id,
      userId: row.userId,
      courseId: row.courseId,
      status: row.status,
      source: row.source as Enrollment["source"],
      couponCode: row.couponCode,
      couponDiscount: row.couponDiscount,
      createdAt: row.createdAt,
      completedLessonIds: [...row.completedLessonIds],
      lastLessonId: row.lastLessonId,
      progressPercent: row.progressPercent,
      markLessonComplete: function (lessonId: string, courseLessonCount: number): void {
        if (!this.completedLessonIds.includes(lessonId)) {
          this.completedLessonIds.push(lessonId);
        }
        this.lastLessonId = lessonId;
        this.progressPercent =
          courseLessonCount > 0
            ? Math.min(100, Math.floor((this.completedLessonIds.length / courseLessonCount) * 100))
            : 0;
      },
    };
  }

  async update(enrollment: Enrollment): Promise<Result<Enrollment, EnrollmentError>> {
    try {
      const row = await this.db.enrollment.update({
        where: { id: enrollment.id },
        data: {
          completedLessonIds: enrollment.completedLessonIds,
          lastLessonId: enrollment.lastLessonId,
          progressPercent: enrollment.progressPercent,
        },
      });
      return Result.ok(this.mapRow(row));
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code: string }).code === "P2025"
      ) {
        return Result.err({ kind: "not_found" });
      }
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }
}

/**
 * Change one student's access to one course from an audited admin path.
 * Existing progress is preserved and refunded access cannot be restored.
 */
import { Result } from "@/domain/shared/Result";
import {
  createEnrollment,
  withEnrollmentStatus,
  type Enrollment,
} from "@/domain/entities/Enrollment";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import type { CourseRepository } from "@/ports/repositories/CourseRepository";
import type { IEnrollmentRepository } from "@/ports/repositories/IEnrollmentRepository";
import type { IdGenerator } from "@/ports/system/IdGenerator";
import type { Clock } from "@/ports/system/Clock";
import type { RecordAuditLog } from "@/usecases/RecordAuditLog";

export interface AdminSetEnrollmentStatusInput {
  userId: string;
  courseId: string;
  actorId: string;
  status: "active" | "cancelled";
}

export type AdminSetEnrollmentStatusError =
  | { kind: "user_not_found" }
  | { kind: "course_not_found" }
  | { kind: "not_enrolled" }
  | { kind: "refunded_enrollment" }
  | { kind: "db_error"; message: string };

export interface AdminSetEnrollmentStatusOutput {
  enrollment: Enrollment;
  changed: boolean;
  change: "granted" | "revoked" | "restored" | "none";
}

export interface AdminSetEnrollmentStatusDeps {
  userRepo: UserRepository;
  courseRepo: CourseRepository;
  enrollmentRepo: IEnrollmentRepository;
  idGen: IdGenerator;
  clock: Clock;
  recordAuditLog: RecordAuditLog;
}

export class AdminSetEnrollmentStatus {
  constructor(private readonly deps: AdminSetEnrollmentStatusDeps) {}

  async execute(
    input: AdminSetEnrollmentStatusInput,
  ): Promise<Result<AdminSetEnrollmentStatusOutput, AdminSetEnrollmentStatusError>> {
    const userResult = await this.deps.userRepo.findById(input.userId);
    if (!userResult.ok) {
      return userResult.error.kind === "not_found"
        ? Result.err({ kind: "user_not_found" })
        : Result.err({
            kind: "db_error",
            message:
              userResult.error.kind === "db_error"
                ? userResult.error.message
                : userResult.error.kind,
          });
    }

    const courseResult = await this.deps.courseRepo.findById(input.courseId);
    if (!courseResult.ok) {
      return courseResult.error.kind === "not_found"
        ? Result.err({ kind: "course_not_found" })
        : Result.err({
            kind: "db_error",
            message:
              courseResult.error.kind === "db_error"
                ? courseResult.error.message
                : courseResult.error.kind,
          });
    }

    const existing = await this.deps.enrollmentRepo.findByUserIdAndCourseId(
      input.userId,
      input.courseId,
    );

    if (!existing) {
      if (input.status === "cancelled") {
        return Result.err({ kind: "not_enrolled" });
      }
      const built = createEnrollment({
        id: this.deps.idGen.newId(),
        userId: input.userId,
        courseId: input.courseId,
        createdAt: this.deps.clock.now(),
      });
      if (!built.ok) {
        return Result.err({ kind: "db_error", message: built.error.kind });
      }
      const created = await this.deps.enrollmentRepo.create(built.value);
      if (!created.ok) {
        return Result.err({
          kind: "db_error",
          message: created.error.kind === "db_error" ? created.error.message : created.error.kind,
        });
      }
      await this.recordChange(input, created.value, "enrollment.granted", null);
      return Result.ok({ enrollment: created.value, changed: true, change: "granted" });
    }

    if (existing.status === input.status) {
      return Result.ok({ enrollment: existing, changed: false, change: "none" });
    }
    if (existing.status === "refunded" && input.status === "active") {
      return Result.err({ kind: "refunded_enrollment" });
    }

    const saved = await this.deps.enrollmentRepo.update(
      withEnrollmentStatus(existing, input.status),
    );
    if (!saved.ok) {
      return Result.err({
        kind: "db_error",
        message: saved.error.kind === "db_error" ? saved.error.message : saved.error.kind,
      });
    }

    await this.recordChange(
      input,
      saved.value,
      input.status === "active" ? "enrollment.restored" : "enrollment.revoked",
      existing.status,
    );
    return Result.ok({
      enrollment: saved.value,
      changed: true,
      change: input.status === "active" ? "restored" : "revoked",
    });
  }

  private async recordChange(
    input: AdminSetEnrollmentStatusInput,
    enrollment: Enrollment,
    action: "enrollment.granted" | "enrollment.revoked" | "enrollment.restored",
    previousStatus: Enrollment["status"] | null,
  ): Promise<void> {
    await this.deps.recordAuditLog.execute({
      actorId: input.actorId,
      action,
      targetType: "enrollment",
      targetId: enrollment.id,
      metadata: {
        userId: input.userId,
        courseId: input.courseId,
        previousStatus,
        status: enrollment.status,
      },
    });
  }
}

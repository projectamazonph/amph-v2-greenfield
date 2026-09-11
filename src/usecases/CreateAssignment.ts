/**
 * CreateAssignment — admin assigns work to a student (P1-02, PR-C slice 2).
 *
 * Validates the assignee and the course exist, builds a PENDING
 * assignment in the domain, persists it, and audits the outcome
 * (`assignment.created` / `assignment.create_failed`).
 */

import { Result } from "@/domain/shared/Result";
import {
  createAssignment,
  type Assignment,
  type CreateAssignmentError,
} from "@/domain/entities/Assignment";
import type { IAssignmentRepository } from "@/ports/repositories/IAssignmentRepository";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import type { CourseRepository } from "@/ports/repositories/CourseRepository";
import type { IdGenerator } from "@/ports/system/IdGenerator";
import type { Clock } from "@/ports/system/Clock";
import type { RecordAuditLog } from "@/usecases/RecordAuditLog";

export interface CreateAssignmentInput {
  actorId: string;
  courseId: string;
  /** Assignee email, resolved to a user inside the use case. */
  userEmail: string;
  title: string;
  description: string;
  dueAt: Date;
}

export type CreateAssignmentUseCaseError =
  | CreateAssignmentError
  | { kind: "user_not_found" }
  | { kind: "course_not_found" }
  | { kind: "db_error"; message: string };

export type CreateAssignmentResult = Result<Assignment, CreateAssignmentUseCaseError>;

export interface CreateAssignmentDeps {
  assignmentRepo: IAssignmentRepository;
  userRepo: UserRepository;
  courseRepo: CourseRepository;
  idGen: IdGenerator;
  clock: Clock;
  recordAuditLog: RecordAuditLog;
}

export class CreateAssignment {
  constructor(private readonly deps: CreateAssignmentDeps) {}

  async execute(input: CreateAssignmentInput): Promise<CreateAssignmentResult> {
    const audit = (action: "assignment.created" | "assignment.create_failed", metadata: Record<string, unknown>) =>
      this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action,
        targetType: "assignment",
        targetId: input.userEmail,
        metadata,
      });

    const userResult = await this.deps.userRepo.findByEmail(input.userEmail.trim());
    if (!userResult.ok) {
      await audit("assignment.create_failed", { outcome: "user_not_found" });
      return Result.err({ kind: "user_not_found" });
    }

    const built = createAssignment({
      id: this.deps.idGen.newId(),
      courseId: input.courseId,
      userId: userResult.value.id,
      title: input.title,
      description: input.description,
      dueAt: input.dueAt,
      createdById: input.actorId,
      createdAt: this.deps.clock.now(),
    });
    if (!built.ok) {
      await audit("assignment.create_failed", { outcome: built.error.kind });
      return Result.err(built.error);
    }

    const courseResult = await this.deps.courseRepo.findById(input.courseId);
    if (!courseResult.ok) {
      await audit("assignment.create_failed", { outcome: "course_not_found" });
      return Result.err({ kind: "course_not_found" });
    }

    const created = await this.deps.assignmentRepo.create(built.value);
    if (!created.ok) {
      await audit("assignment.create_failed", {
        outcome: "db_error",
        message: created.error.message,
      });
      return Result.err({ kind: "db_error", message: created.error.message });
    }

    await audit("assignment.created", {
      outcome: "success",
      assignmentId: created.value.id,
      courseId: input.courseId,
      userId: created.value.userId,
    });
    return Result.ok(created.value);
  }
}

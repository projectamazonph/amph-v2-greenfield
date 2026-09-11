/**
 * GradeAssignment — a grader closes a submitted assignment (P1-02, PR-C slice 2).
 *
 * Only SUBMITTED rows move, with an integer 0–100 and feedback.
 * The actor id is recorded as the grader. Audited as
 * `assignment.graded` / `assignment.grade_failed`.
 */

import { Result } from "@/domain/shared/Result";
import {
  gradeAssignment,
  type Assignment,
  type GradeAssignmentError,
} from "@/domain/entities/Assignment";
import type { IAssignmentRepository } from "@/ports/repositories/IAssignmentRepository";
import type { Clock } from "@/ports/system/Clock";
import type { RecordAuditLog } from "@/usecases/RecordAuditLog";

export interface GradeAssignmentInput {
  actorId: string;
  assignmentId: string;
  grade: number;
  feedback?: string | null;
}

export type GradeAssignmentUseCaseError =
  | GradeAssignmentError
  | { kind: "assignment_not_found" }
  | { kind: "db_error"; message: string };

export type GradeAssignmentResult = Result<Assignment, GradeAssignmentUseCaseError>;

export interface GradeAssignmentDeps {
  assignmentRepo: IAssignmentRepository;
  clock: Clock;
  recordAuditLog: RecordAuditLog;
}

export class GradeAssignment {
  constructor(private readonly deps: GradeAssignmentDeps) {}

  async execute(input: GradeAssignmentInput): Promise<GradeAssignmentResult> {
    const audit = (action: "assignment.graded" | "assignment.grade_failed", metadata: Record<string, unknown>) =>
      this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action,
        targetType: "assignment",
        targetId: input.assignmentId,
        metadata,
      });

    const found = await this.deps.assignmentRepo.findById(input.assignmentId);
    if (!found.ok) {
      await audit("assignment.grade_failed", {
        outcome: "db_error",
        message: found.error.message,
      });
      return Result.err({ kind: "db_error", message: found.error.message });
    }
    if (found.value === null) {
      await audit("assignment.grade_failed", { outcome: "assignment_not_found" });
      return Result.err({ kind: "assignment_not_found" });
    }

    const graded = gradeAssignment(found.value, {
      graderId: input.actorId,
      grade: input.grade,
      feedback: input.feedback ?? null,
      gradedAt: this.deps.clock.now(),
    });
    if (!graded.ok) {
      await audit("assignment.grade_failed", { outcome: graded.error.kind });
      return Result.err(graded.error);
    }

    const persisted = await this.deps.assignmentRepo.update(graded.value);
    if (!persisted.ok) {
      const outcome = persisted.error.kind;
      await audit("assignment.grade_failed", {
        outcome,
        message: outcome === "db_error" ? persisted.error.message : undefined,
      });
      if (outcome === "not_found") {
        return Result.err({ kind: "assignment_not_found" });
      }
      return Result.err({ kind: "db_error", message: persisted.error.message });
    }

    await audit("assignment.graded", {
      outcome: "success",
      assignmentId: persisted.value.id,
      grade: persisted.value.grade,
    });
    return Result.ok(persisted.value);
  }
}

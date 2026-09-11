/**
 * SubmitAssignment — the assignee marks work as done (P1-02, PR-C slice 2).
 *
 * Only the assigned student can submit, and only a PENDING row moves.
 * Audited as `assignment.submitted` / `assignment.submit_failed`
 * with the student as the actor.
 */

import { Result } from "@/domain/shared/Result";
import {
  submitAssignment,
  type Assignment,
  type SubmitAssignmentError,
} from "@/domain/entities/Assignment";
import type { IAssignmentRepository } from "@/ports/repositories/IAssignmentRepository";
import type { Clock } from "@/ports/system/Clock";
import type { RecordAuditLog } from "@/usecases/RecordAuditLog";

export interface SubmitAssignmentInput {
  userId: string;
  assignmentId: string;
}

export type SubmitAssignmentUseCaseError =
  | SubmitAssignmentError
  | { kind: "assignment_not_found" }
  | { kind: "db_error"; message: string };

export type SubmitAssignmentResult = Result<Assignment, SubmitAssignmentUseCaseError>;

export interface SubmitAssignmentDeps {
  assignmentRepo: IAssignmentRepository;
  clock: Clock;
  recordAuditLog: RecordAuditLog;
}

export class SubmitAssignment {
  constructor(private readonly deps: SubmitAssignmentDeps) {}

  async execute(input: SubmitAssignmentInput): Promise<SubmitAssignmentResult> {
    const audit = (action: "assignment.submitted" | "assignment.submit_failed", metadata: Record<string, unknown>) =>
      this.deps.recordAuditLog.execute({
        actorId: input.userId,
        action,
        targetType: "assignment",
        targetId: input.assignmentId,
        metadata,
      });

    const found = await this.deps.assignmentRepo.findById(input.assignmentId);
    if (!found.ok) {
      await audit("assignment.submit_failed", {
        outcome: "db_error",
        message: found.error.message,
      });
      return Result.err({ kind: "db_error", message: found.error.message });
    }
    if (found.value === null) {
      await audit("assignment.submit_failed", { outcome: "assignment_not_found" });
      return Result.err({ kind: "assignment_not_found" });
    }

    const submitted = submitAssignment(found.value, {
      submittedById: input.userId,
      submittedAt: this.deps.clock.now(),
    });
    if (!submitted.ok) {
      await audit("assignment.submit_failed", { outcome: submitted.error.kind });
      return Result.err(submitted.error);
    }

    const persisted = await this.deps.assignmentRepo.update(submitted.value);
    if (!persisted.ok) {
      const outcome = persisted.error.kind;
      await audit("assignment.submit_failed", {
        outcome,
        message: outcome === "db_error" ? persisted.error.message : undefined,
      });
      if (outcome === "not_found") {
        return Result.err({ kind: "assignment_not_found" });
      }
      return Result.err({ kind: "db_error", message: persisted.error.message });
    }

    await audit("assignment.submitted", {
      outcome: "success",
      assignmentId: persisted.value.id,
    });
    return Result.ok(persisted.value);
  }
}

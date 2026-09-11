/**
 * RemoveCoursePrerequisite — admin lifts a course gate (P1-01, PR-C slice 1).
 *
 * Removal is a soft delete (deletedAt stamp) so the rule's history stays
 * queryable and the unique triple can be re-added later without a
 * constraint conflict. Audited as `prerequisite.removed` on success and
 * `prerequisite.remove_failed` otherwise.
 */

import { Result } from "@/domain/shared/Result";
import type { Prerequisite } from "@/domain/entities/Prerequisite";
import type { IPrerequisiteRepository } from "@/ports/repositories/IPrerequisiteRepository";
import type { Clock } from "@/ports/system/Clock";
import type { RecordAuditLog } from "@/usecases/RecordAuditLog";

export interface RemoveCoursePrerequisiteInput {
  actorId: string;
  courseId: string;
  requiresCourseId: string;
  requiresLessonId?: string | null;
}

export type RemoveCoursePrerequisiteError =
  | { kind: "prerequisite_not_found" }
  | { kind: "db_error"; message: string };

export type RemoveCoursePrerequisiteResult = Result<
  Prerequisite,
  RemoveCoursePrerequisiteError
>;

export interface RemoveCoursePrerequisiteDeps {
  prerequisiteRepo: IPrerequisiteRepository;
  clock: Clock;
  recordAuditLog: RecordAuditLog;
}

export class RemoveCoursePrerequisite {
  constructor(private readonly deps: RemoveCoursePrerequisiteDeps) {}

  async execute(
    input: RemoveCoursePrerequisiteInput,
  ): Promise<RemoveCoursePrerequisiteResult> {
    const requiresLessonId = input.requiresLessonId ?? null;
    const audit = (action: "prerequisite.removed" | "prerequisite.remove_failed", metadata: Record<string, unknown>) =>
      this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action,
        targetType: "prerequisite",
        targetId: `${input.courseId}->${input.requiresCourseId}`,
        metadata,
      });

    const existing = await this.deps.prerequisiteRepo.findRule(
      input.courseId,
      input.requiresCourseId,
      requiresLessonId,
    );
    if (!existing.ok) {
      await audit("prerequisite.remove_failed", {
        outcome: "db_error",
        message: existing.error.message,
      });
      return Result.err({ kind: "db_error", message: existing.error.message });
    }
    if (existing.value === null) {
      await audit("prerequisite.remove_failed", { outcome: "prerequisite_not_found" });
      return Result.err({ kind: "prerequisite_not_found" });
    }

    const now = this.deps.clock.now();
    const removed: Prerequisite = {
      ...existing.value,
      deletedAt: now,
      updatedById: input.actorId,
    };
    const updated = await this.deps.prerequisiteRepo.update(removed);
    if (!updated.ok) {
      await audit("prerequisite.remove_failed", {
        outcome: updated.error.kind,
        message: updated.error.kind === "db_error" ? updated.error.message : undefined,
      });
      if (updated.error.kind === "not_found") {
        return Result.err({ kind: "prerequisite_not_found" });
      }
      return Result.err({ kind: "db_error", message: updated.error.message });
    }

    await audit("prerequisite.removed", { outcome: "success", ruleId: updated.value.id });
    return Result.ok(updated.value);
  }
}

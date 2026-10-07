/**
 * ReturnCapstoneForReview — reviewer sends a submission back (LEARN-044).
 *
 * Authorisation is delegated to the caller (`requireAdmin` in the
 * action). The note is required by the domain; the use case audits
 * every outcome (`capstone.returned` / `capstone.return_failed`).
 * The learner sees the note on /capstone (LEARN-043 page).
 */

import { Result } from "@/domain/shared/Result";
import {
  returnCapstoneForRevision,
  type CapstoneSubmission,
  type ReturnCapstoneError,
} from "@/domain/entities/CapstoneSubmission";
import type { ICapstoneRepository } from "@/ports/repositories/ICapstoneRepository";
import type { Clock } from "@/ports/system/Clock";
import type { RecordAuditLog } from "@/usecases/RecordAuditLog";

export interface ReturnCapstoneForReviewInput {
  actorId: string;
  submissionId: string;
  note: string;
}

export type ReturnCapstoneForReviewError =
  ReturnCapstoneError | { kind: "not_found" } | { kind: "db_error"; message: string };

export interface ReturnCapstoneForReviewDeps {
  capstoneRepo: ICapstoneRepository;
  clock: Clock;
  recordAuditLog: RecordAuditLog;
}

export class ReturnCapstoneForReview {
  constructor(private readonly deps: ReturnCapstoneForReviewDeps) {}

  async execute(
    input: ReturnCapstoneForReviewInput,
  ): Promise<Result<CapstoneSubmission, ReturnCapstoneForReviewError>> {
    const audit = (
      action: "capstone.returned" | "capstone.return_failed",
      metadata: Record<string, unknown>,
    ) =>
      this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action,
        targetType: "capstone_submission",
        targetId: input.submissionId,
        metadata,
      });

    const found = await this.deps.capstoneRepo.findById(input.submissionId);
    if (!found.ok) {
      await audit("capstone.return_failed", { outcome: "db_error" });
      return Result.err({ kind: "db_error", message: found.error.message });
    }
    if (!found.value) {
      await audit("capstone.return_failed", { outcome: "not_found" });
      return Result.err({ kind: "not_found" });
    }
    const returned = returnCapstoneForRevision(found.value, {
      reviewerId: input.actorId,
      note: input.note,
      decidedAt: this.deps.clock.now(),
    });
    if (!returned.ok) {
      await audit("capstone.return_failed", { outcome: returned.error.kind });
      return returned;
    }
    const saved = await this.deps.capstoneRepo.update(returned.value);
    if (!saved.ok) {
      const outcome = saved.error.kind;
      await audit("capstone.return_failed", { outcome });
      if (outcome === "not_found") return Result.err({ kind: "not_found" });
      return Result.err({ kind: "db_error", message: saved.error.message });
    }
    await audit("capstone.returned", { outcome: "ok" });
    return Result.ok(saved.value);
  }
}

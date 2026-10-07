/**
 * PassCapstoneReview — reviewer marks a submission PASSED (LEARN-044).
 *
 * Authorisation is delegated to the caller (`requireAdmin` in the
 * action). The six-artefact gate is enforced by the domain; the use
 * case audits every outcome (`capstone.passed` /
 * `capstone.pass_failed`). Passing records completion evidence
 * only — never an employment claim. Certificate issuance on pass
 * is a later story reusing the existing IssueCertificate flow.
 */

import { Result } from "@/domain/shared/Result";
import {
  passCapstone,
  type CapstoneSubmission,
  type PassCapstoneError,
} from "@/domain/entities/CapstoneSubmission";
import type { ICapstoneRepository } from "@/ports/repositories/ICapstoneRepository";
import type { Clock } from "@/ports/system/Clock";
import type { RecordAuditLog } from "@/usecases/RecordAuditLog";

export interface PassCapstoneReviewInput {
  actorId: string;
  submissionId: string;
}

export type PassCapstoneReviewError =
  PassCapstoneError | { kind: "not_found" } | { kind: "db_error"; message: string };

export interface PassCapstoneReviewDeps {
  capstoneRepo: ICapstoneRepository;
  clock: Clock;
  recordAuditLog: RecordAuditLog;
}

export class PassCapstoneReview {
  constructor(private readonly deps: PassCapstoneReviewDeps) {}

  async execute(
    input: PassCapstoneReviewInput,
  ): Promise<Result<CapstoneSubmission, PassCapstoneReviewError>> {
    const audit = (
      action: "capstone.passed" | "capstone.pass_failed",
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
      await audit("capstone.pass_failed", { outcome: "db_error" });
      return Result.err({ kind: "db_error", message: found.error.message });
    }
    if (!found.value) {
      await audit("capstone.pass_failed", { outcome: "not_found" });
      return Result.err({ kind: "not_found" });
    }
    const passed = passCapstone(found.value, {
      reviewerId: input.actorId,
      decidedAt: this.deps.clock.now(),
    });
    if (!passed.ok) {
      await audit("capstone.pass_failed", { outcome: passed.error.kind });
      return passed;
    }
    const saved = await this.deps.capstoneRepo.update(passed.value);
    if (!saved.ok) {
      const outcome = saved.error.kind;
      await audit("capstone.pass_failed", { outcome });
      if (outcome === "not_found") return Result.err({ kind: "not_found" });
      return Result.err({ kind: "db_error", message: saved.error.message });
    }
    await audit("capstone.passed", { outcome: "ok" });
    return Result.ok(saved.value);
  }
}

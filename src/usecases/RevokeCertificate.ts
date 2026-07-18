/**
 * RevokeCertificate — transition a certificate from active to revoked.
 *
 * STORY-044: RevokeCertificate on refund + revocation badge.
 *
 * Called by:
 *  - Admin server action (manual revocation, e.g. fraud / chargeback)
 *  - Future refund processor (auto-revocation on refund)
 *
 * Idempotent: revoking an already-revoked cert returns success with
 * `wasAlreadyRevoked: true`. This makes admin retries safe.
 *
 * Flow:
 *  1. Validate inputs
 *  2. Find cert
 *  3. If already revoked → return idempotent success
 *  4. Transition via the domain's revokeCertificate factory
 *  5. Persist via the repo
 *  6. Return the revoked cert
 */

import { Result } from "@/domain/shared/Result";
import type { Certificate } from "@/domain/entities/Certificate";
import { revokeCertificate } from "@/domain/entities/Certificate";
import type { ICertificateRepository } from "@/ports/repositories/ICertificateRepository";
import type { Clock } from "@/ports/system/Clock";

// ── Input / Output types ───────────────────────────────────────────────────

export interface RevokeCertificateInput {
  certificateId: string;
  reason: string;
  /** userId of the admin, or "system" for automated callers. */
  revokedBy: string;
}

export type RevokeCertificateError =
  | { kind: "certificate_not_found" }
  | { kind: "invalid_reason" }
  | { kind: "invalid_revoked_by" }
  | { kind: "db_error"; message: string };

export type RevokeCertificateResult = Result<
  { certificate: Certificate; wasAlreadyRevoked: boolean },
  RevokeCertificateError
>;

// ── Dependencies ───────────────────────────────────────────────────────────

export interface RevokeCertificateDeps {
  certificateRepo: ICertificateRepository;
  clock: Clock;
}

// ── Use Case ───────────────────────────────────────────────────────────────

export class RevokeCertificate {
  constructor(private readonly deps: RevokeCertificateDeps) {}

  async execute(input: RevokeCertificateInput): Promise<RevokeCertificateResult> {
    // ── 1. Validate inputs ──────────────────────────────────
    if (!input.revokedBy.trim()) {
      return Result.err({ kind: "invalid_revoked_by" });
    }
    if (!input.reason.trim()) {
      return Result.err({ kind: "invalid_reason" });
    }

    // ── 2. Find certificate ──────────────────────────────────
    const certResult = await this.deps.certificateRepo.findById(input.certificateId);
    if (!certResult.ok) {
      if (certResult.error.kind === "not_found") {
        return Result.err({ kind: "certificate_not_found" });
      }
      if (certResult.error.kind === "db_error") {
        return Result.err({ kind: "db_error", message: certResult.error.message });
      }
      return Result.err({ kind: "db_error", message: "Failed to fetch certificate" });
    }
    const existing = certResult.value;
    if (!existing) {
      return Result.err({ kind: "certificate_not_found" });
    }

    // ── 3. Idempotent short-circuit ─────────────────────────
    if (existing.status === "revoked") {
      return Result.ok({ certificate: existing, wasAlreadyRevoked: true });
    }

    // ── 4. Domain transition ─────────────────────────────────
    const transitionResult = revokeCertificate(
      existing,
      this.deps.clock.now(),
      input.reason,
    );
    if (!transitionResult.ok) {
      // Should be unreachable: we already checked status === "active".
      // The domain still has a `db_error` variant for empty reason,
      // which we already guarded against at the top.
      return Result.err({
        kind: "db_error",
        message: `Domain transition failed: ${transitionResult.error.kind}`,
      });
    }

    // ── 5. Persist ───────────────────────────────────────────
    const updateResult = await this.deps.certificateRepo.update(transitionResult.value);
    if (!updateResult.ok) {
      if (updateResult.error.kind === "not_found") {
        // Race: cert was deleted between findById and update. Treat as not_found.
        return Result.err({ kind: "certificate_not_found" });
      }
      if (updateResult.error.kind === "db_error") {
        return Result.err({ kind: "db_error", message: updateResult.error.message });
      }
      return Result.err({ kind: "db_error", message: "Failed to persist revocation" });
    }

    return Result.ok({ certificate: updateResult.value, wasAlreadyRevoked: false });
  }
}

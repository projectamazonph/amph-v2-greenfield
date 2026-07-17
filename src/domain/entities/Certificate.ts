/**
 * Certificate — proof of course completion for a user.
 *
 * STORY-041: Certificate model + repo + IssueCertificate use case.
 *
 * A certificate is a permanent record that a user completed a course.
 * The `verificationHash` is a public, deterministic fingerprint of the
 * issuance — it lives in the URL `/certificates/{hash}` for the public
 * verification view (STORY-043). It is NOT a secret; it's just a
 * stable identifier so the public view can re-derive / re-verify it.
 *
 * A certificate can be revoked (e.g. on refund per STORY-044) but never
 * deleted — the row is kept for audit.
 */

import { Result } from "@/domain/shared/Result";

// ── Types ──────────────────────────────────────────────────────────────────

export type CertificateStatus = "active" | "revoked";

export interface Certificate {
  readonly id: string;
  readonly userId: string;
  readonly courseId: string;
  /** 64-char lowercase hex sha256 of (id, userId, courseId, issuedAt.iso). */
  readonly verificationHash: string;
  readonly issuedAt: Date;
  readonly revokedAt: Date | null;
  readonly revokedReason: string | null;
  readonly status: CertificateStatus;
}

export type CertificateError =
  | { kind: "invalid_verification_hash" }
  | { kind: "invalid_status_transition"; from: CertificateStatus; to: CertificateStatus }
  | { kind: "db_error"; message: string };

export type CreateCertificateParams = {
  id: string;
  userId: string;
  courseId: string;
  verificationHash: string;
  issuedAt: Date;
};

// ── Constants ──────────────────────────────────────────────────────────────

/** sha256 hex output is always 64 lowercase hex chars. */
const VERIFICATION_HASH_REGEX = /^[0-9a-f]{64}$/;

// ── Factory ────────────────────────────────────────────────────────────────

export function createCertificate(
  params: CreateCertificateParams,
): Result<Certificate, CertificateError> {
  if (!VERIFICATION_HASH_REGEX.test(params.verificationHash)) {
    return Result.err({ kind: "invalid_verification_hash" });
  }

  return Result.ok({
    id: params.id,
    userId: params.userId,
    courseId: params.courseId,
    verificationHash: params.verificationHash,
    issuedAt: params.issuedAt,
    revokedAt: null,
    revokedReason: null,
    status: "active",
  });
}

// ── Transitions ────────────────────────────────────────────────────────────

/**
 * Revoke a certificate. Idempotent only on the "already revoked" check —
 * if you call this twice on an active cert, the second call returns
 * `invalid_status_transition` (from=revoked, to=revoked). STORY-044
 * guards against that at the use-case level.
 */
export function revokeCertificate(
  cert: Certificate,
  at: Date,
  reason: string,
): Result<Certificate, CertificateError> {
  if (cert.status !== "active") {
    return Result.err({
      kind: "invalid_status_transition",
      from: cert.status,
      to: "revoked",
    });
  }

  if (!reason.trim()) {
    return Result.err({ kind: "db_error", message: "Revocation reason must not be empty" });
  }

  return Result.ok({
    ...cert,
    status: "revoked",
    revokedAt: at,
    revokedReason: reason,
  });
}

/**
 * RevokeCertificate use case tests — TDD (red first).
 *
 * STORY-044: RevokeCertificate on refund + revocation badge.
 */

import { describe, it, expect, vi } from "vitest";
import { RevokeCertificate } from "@/usecases/RevokeCertificate";
import { Result } from "@/domain/shared/Result";
import type { Certificate } from "@/domain/entities/Certificate";
import type { ICertificateRepository } from "@/ports/repositories/ICertificateRepository";
import type { Clock } from "@/ports/system/Clock";

const CERT_ID = "cert_01";
const NOW = new Date("2026-08-01T00:00:00Z");

// ── Fixtures ───────────────────────────────────────────────────────────────

function makeCertificate(overrides: Partial<Certificate> = {}): Certificate {
  return {
    id: CERT_ID,
    userId: "user_01",
    courseId: "course_01",
    verificationHash: "a".repeat(64),
    issuedAt: new Date("2026-07-01T00:00:00Z"),
    revokedAt: null,
    revokedReason: null,
    status: "active",
    ...overrides,
  };
}

// ── Test doubles ───────────────────────────────────────────────────────────

function buildCertRepo(
  findByIdResult: Result<Certificate | null, { kind: "not_found" } | { kind: "db_error"; message: string }>,
  updateResult?: Result<Certificate, { kind: "not_found" } | { kind: "db_error"; message: string }>,
): ICertificateRepository {
  return {
    create: vi.fn(async () => Result.ok({} as Certificate)),
    findById: vi.fn(async () => findByIdResult),
    findByVerificationHash: vi.fn(async () => Result.ok(null)),
    findByUserId: vi.fn(async () => Result.ok([])),
    // Default: echo the input cert back (so the use case's revoked
    // cert flows through). Tests that want a specific update failure
    // pass an explicit `updateResult` second arg.
    update: vi.fn(async (c: Certificate) =>
      updateResult ?? (Result.ok(c) as Result<Certificate, { kind: "not_found" } | { kind: "db_error"; message: string }>),
    ),
  };
}

function buildClock(): Clock {
  return { now: () => NOW };
}

function buildUseCase(overrides: {
  certRepo?: ICertificateRepository;
  clock?: Clock;
} = {}): {
  useCase: RevokeCertificate;
  certRepo: ICertificateRepository;
} {
  const certRepo = overrides.certRepo ?? buildCertRepo(Result.ok(makeCertificate()) as Result<Certificate | null, { kind: "not_found" } | { kind: "db_error"; message: string }>);
  const clock = overrides.clock ?? buildClock();
  return {
    useCase: new RevokeCertificate({ certificateRepo: certRepo, clock }),
    certRepo,
  };
}

function okRepo<T>(value: T): Result<T, { kind: "not_found" } | { kind: "db_error"; message: string }> {
  return Result.ok(value) as unknown as Result<T, { kind: "not_found" } | { kind: "db_error"; message: string }>;
}
function errRepo<T>(error: { kind: "not_found" } | { kind: "db_error"; message: string }): Result<T, { kind: "not_found" } | { kind: "db_error"; message: string }> {
  return Result.err(error) as unknown as Result<T, { kind: "not_found" } | { kind: "db_error"; message: string }>;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("RevokeCertificate", () => {
  it("revokes an active cert and returns wasAlreadyRevoked: false", async () => {
    const { useCase, certRepo } = buildUseCase();

    const result = await useCase.execute({
      certificateId: CERT_ID,
      reason: "refund_issued",
      revokedBy: "admin_01",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.wasAlreadyRevoked).toBe(false);
    expect(result.value.certificate.status).toBe("revoked");
    expect(result.value.certificate.revokedReason).toBe("refund_issued");
    expect(result.value.certificate.revokedAt).toEqual(NOW);
    expect(certRepo.update).toHaveBeenCalledOnce();
  });

  it("preserves the existing cert fields on the returned cert", async () => {
    const issued = new Date("2026-06-15T00:00:00Z");
    const certRepo = buildCertRepo(okRepo<Certificate | null>(makeCertificate({ issuedAt: issued })));
    const { useCase } = buildUseCase({ certRepo });
    const result = await useCase.execute({
      certificateId: CERT_ID,
      reason: "fraud",
      revokedBy: "admin_01",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.certificate.id).toBe(CERT_ID);
    expect(result.value.certificate.userId).toBe("user_01");
    expect(result.value.certificate.courseId).toBe("course_01");
    expect(result.value.certificate.verificationHash).toBe("a".repeat(64));
    expect(result.value.certificate.issuedAt).toEqual(issued);
  });

  it("accepts 'system' as the revokedBy value (for future automated callers)", async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute({
      certificateId: CERT_ID,
      reason: "refund_issued",
      revokedBy: "system",
    });

    expect(result.ok).toBe(true);
  });

  it("is idempotent: revoking an already-revoked cert returns wasAlreadyRevoked: true", async () => {
    const revoked = makeCertificate({
      status: "revoked",
      revokedAt: new Date("2026-07-15T00:00:00Z"),
      revokedReason: "previous reason",
    });
    const certRepo = buildCertRepo(okRepo<Certificate | null>(revoked));
    const { useCase } = buildUseCase({ certRepo });

    const result = await useCase.execute({
      certificateId: CERT_ID,
      reason: "new reason",
      revokedBy: "admin_01",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.wasAlreadyRevoked).toBe(true);
    // The original revocation metadata is preserved, not overwritten
    expect(result.value.certificate.revokedReason).toBe("previous reason");
    expect(certRepo.update).not.toHaveBeenCalled();
  });

  it("returns certificate_not_found when the cert does not exist (null)", async () => {
    const certRepo = buildCertRepo(okRepo<Certificate | null>(null));
    const { useCase } = buildUseCase({ certRepo });

    const result = await useCase.execute({
      certificateId: "missing",
      reason: "fraud",
      revokedBy: "admin_01",
    });

    expect(result).toEqual({ ok: false, error: { kind: "certificate_not_found" } });
  });

  it("returns certificate_not_found when the cert repo returns not_found", async () => {
    const certRepo = buildCertRepo(errRepo<Certificate | null>({ kind: "not_found" }));
    const { useCase } = buildUseCase({ certRepo });

    const result = await useCase.execute({
      certificateId: "missing",
      reason: "fraud",
      revokedBy: "admin_01",
    });

    expect(result).toEqual({ ok: false, error: { kind: "certificate_not_found" } });
  });

  it("returns db_error when the cert repo returns a non-not_found error", async () => {
    const certRepo = buildCertRepo(errRepo<Certificate | null>({ kind: "db_error", message: "connection lost" }));
    const { useCase } = buildUseCase({ certRepo });

    const result = await useCase.execute({
      certificateId: CERT_ID,
      reason: "fraud",
      revokedBy: "admin_01",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
    if (result.error.kind !== "db_error") return;
    expect(result.error.message).toBe("connection lost");
  });

  it("returns invalid_reason when the reason is empty", async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute({
      certificateId: CERT_ID,
      reason: "",
      revokedBy: "admin_01",
    });

    expect(result).toEqual({ ok: false, error: { kind: "invalid_reason" } });
  });

  it("returns invalid_reason when the reason is whitespace only", async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute({
      certificateId: CERT_ID,
      reason: "   ",
      revokedBy: "admin_01",
    });

    expect(result).toEqual({ ok: false, error: { kind: "invalid_reason" } });
  });

  it("returns invalid_revoked_by when the revokedBy is empty", async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute({
      certificateId: CERT_ID,
      reason: "fraud",
      revokedBy: "",
    });

    expect(result).toEqual({ ok: false, error: { kind: "invalid_revoked_by" } });
  });

  it("returns invalid_revoked_by when the revokedBy is whitespace only", async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute({
      certificateId: CERT_ID,
      reason: "fraud",
      revokedBy: "  ",
    });

    expect(result).toEqual({ ok: false, error: { kind: "invalid_revoked_by" } });
  });

  it("validates inputs BEFORE hitting the database", async () => {
    const certRepo = buildCertRepo(okRepo<Certificate | null>(null));
    const { useCase } = buildUseCase({ certRepo });

    await useCase.execute({
      certificateId: CERT_ID,
      reason: "",
      revokedBy: "admin_01",
    });

    expect(certRepo.findById).not.toHaveBeenCalled();
  });

  it("returns db_error when the update fails (preserves the original message)", async () => {
    const certRepo = buildCertRepo(
      okRepo<Certificate | null>(makeCertificate()),
      errRepo<Certificate>({ kind: "db_error", message: "update failed: disk full" }),
    );
    const { useCase } = buildUseCase({ certRepo });

    const result = await useCase.execute({
      certificateId: CERT_ID,
      reason: "fraud",
      revokedBy: "admin_01",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
    if (result.error.kind !== "db_error") return;
    expect(result.error.message).toBe("update failed: disk full");
  });

  it("returns certificate_not_found if the update races a delete (not_found on update)", async () => {
    const certRepo = buildCertRepo(
      okRepo<Certificate | null>(makeCertificate()),
      errRepo<Certificate>({ kind: "not_found" }),
    );
    const { useCase } = buildUseCase({ certRepo });

    const result = await useCase.execute({
      certificateId: CERT_ID,
      reason: "fraud",
      revokedBy: "admin_01",
    });

    expect(result).toEqual({ ok: false, error: { kind: "certificate_not_found" } });
  });
});

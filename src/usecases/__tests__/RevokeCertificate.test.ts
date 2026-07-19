/**
 * RevokeCertificate.test.ts — STORY-044.
 *
 * Tier B coverage for the RevokeCertificate use case. Exercises every
 * branch of the use-case flow:
 *   1. invalid_revoked_by
 *   2. invalid_reason
 *   3. certificate_not_found (findById returns not_found)
 *   4. certificate_not_found (findById returns null)
 *   5. db_error fetching certificate (not_found fallback path)
 *   6. db_error fetching certificate (db_error path)
 *   7. idempotent short-circuit (already revoked)
 *   8. happy path (active → revoked)
 *   9. db_error on persist (db_error)
 *  10. db_error on persist (not_found — race)
 *  11. clock.now() is read for revokedAt
 *  12. reason is persisted on the cert
 *
 * Per repo discipline, we instantiate the in-memory repo directly
 * inside this test file. In-memory adapters never appear in
 * production code.
 */

import { describe, it, expect, vi } from "vitest";
import { RevokeCertificate } from "@/usecases/RevokeCertificate";
import { InMemoryCertificateRepository } from "@/infra/repositories/InMemoryCertificateRepository";
import { FixedClock } from "@/ports/system/Clock";
import type { Certificate } from "@/domain/entities/Certificate";

// ── Fixtures ───────────────────────────────────────────────────────────────

const USER_ID = "user_01";
const COURSE_ID = "course_01";
const CERT_ID = "cert_01";

function makeActiveCert(overrides: Partial<Certificate> = {}): Certificate {
  return {
    id: CERT_ID,
    userId: USER_ID,
    courseId: COURSE_ID,
    verificationHash: "a".repeat(64),
    issuedAt: new Date("2026-01-01T00:00:00Z"),
    revokedAt: null,
    revokedReason: null,
    status: "active",
    ...overrides,
  };
}

function makeRevokedCert(overrides: Partial<Certificate> = {}): Certificate {
  return {
    id: CERT_ID,
    userId: USER_ID,
    courseId: COURSE_ID,
    verificationHash: "a".repeat(64),
    issuedAt: new Date("2026-01-01T00:00:00Z"),
    revokedAt: new Date("2026-02-01T00:00:00Z"),
    revokedReason: "refund",
    status: "revoked",
    ...overrides,
  };
}

function buildDeps(overrides: { clock?: FixedClock; certificateRepo?: InMemoryCertificateRepository } = {}) {
  const certificateRepo = overrides.certificateRepo ?? new InMemoryCertificateRepository();
  return {
    certificateRepo,
    useCase: new RevokeCertificate({
      certificateRepo,
      clock: overrides.clock ?? new FixedClock(new Date("2026-07-19T00:00:00Z")),
    }),
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("RevokeCertificate", () => {
  // ── 1. invalid_revoked_by ──────────────────────────────

  it("returns invalid_revoked_by when revokedBy is empty", async () => {
    const { useCase } = buildDeps();
    const result = await useCase.execute({
      certificateId: CERT_ID,
      reason: "refund",
      revokedBy: "",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("invalid_revoked_by");
  });

  it("returns invalid_revoked_by when revokedBy is whitespace", async () => {
    const { useCase } = buildDeps();
    const result = await useCase.execute({
      certificateId: CERT_ID,
      reason: "refund",
      revokedBy: "   ",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("invalid_revoked_by");
  });

  // ── 2. invalid_reason ──────────────────────────────────

  it("returns invalid_reason when reason is empty", async () => {
    const { useCase } = buildDeps();
    const result = await useCase.execute({
      certificateId: CERT_ID,
      reason: "",
      revokedBy: "admin_01",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("invalid_reason");
  });

  it("returns invalid_reason when reason is whitespace", async () => {
    const { useCase } = buildDeps();
    const result = await useCase.execute({
      certificateId: CERT_ID,
      reason: "   ",
      revokedBy: "admin_01",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("invalid_reason");
  });

  // Note: order of validation — revokedBy is checked BEFORE reason.
  it("checks revokedBy before reason (revokedBy=empty, reason=empty returns invalid_revoked_by)", async () => {
    const { useCase } = buildDeps();
    const result = await useCase.execute({
      certificateId: CERT_ID,
      reason: "",
      revokedBy: "",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("invalid_revoked_by");
  });

  // ── 3. certificate_not_found (findById returns not_found) ─

  it("returns certificate_not_found when the repo returns not_found", async () => {
    const { useCase, certificateRepo } = buildDeps();
    vi.spyOn(certificateRepo, "findById").mockResolvedValue({
      ok: false,
      error: { kind: "not_found" },
    } as never);

    const result = await useCase.execute({
      certificateId: CERT_ID,
      reason: "refund",
      revokedBy: "admin_01",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("certificate_not_found");
  });

  // ── 4. certificate_not_found (findById returns null) ───

  it("returns certificate_not_found when the cert id doesn't exist", async () => {
    const { useCase } = buildDeps();
    // repo is empty
    const result = await useCase.execute({
      certificateId: CERT_ID,
      reason: "refund",
      revokedBy: "admin_01",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("certificate_not_found");
  });

  // ── 5. db_error fetching certificate (fallback path) ───

  it("returns db_error with fallback message when findById returns a non-typed error", async () => {
    // Defensive: if a future repo variant returns a different error kind,
    // the use case should still surface a db_error rather than crash.
    const { useCase, certificateRepo } = buildDeps();
    vi.spyOn(certificateRepo, "findById").mockResolvedValue({
      ok: false,
      // Cast away — this shape is not in the port type, but the use case
      // handles it defensively via the final return.
      error: { kind: "weird_future_error" as never },
    } as never);

    const result = await useCase.execute({
      certificateId: CERT_ID,
      reason: "refund",
      revokedBy: "admin_01",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
    if (result.error.kind !== "db_error") return;
    expect(result.error.message).toMatch(/Failed to fetch certificate/i);
  });

  // ── 6. db_error fetching certificate (db_error path) ───

  it("returns db_error with the repo's message when findById returns db_error", async () => {
    const { useCase, certificateRepo } = buildDeps();
    vi.spyOn(certificateRepo, "findById").mockResolvedValue({
      ok: false,
      error: { kind: "db_error", message: "connection reset" },
    } as never);

    const result = await useCase.execute({
      certificateId: CERT_ID,
      reason: "refund",
      revokedBy: "admin_01",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
    if (result.error.kind !== "db_error") return;
    expect(result.error.message).toBe("connection reset");
  });

  // ── 7. idempotent short-circuit (already revoked) ──────

  it("returns wasAlreadyRevoked=true when the cert is already revoked", async () => {
    const { useCase, certificateRepo } = buildDeps();
    await certificateRepo.create(makeRevokedCert());

    const result = await useCase.execute({
      certificateId: CERT_ID,
      reason: "another refund",
      revokedBy: "admin_01",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.wasAlreadyRevoked).toBe(true);
    expect(result.value.certificate.status).toBe("revoked");
    // The original revokedAt is preserved (not overwritten with a new time)
    expect(result.value.certificate.revokedAt).toEqual(new Date("2026-02-01T00:00:00Z"));
  });

  it("does NOT call update() on the repo when the cert is already revoked", async () => {
    const { useCase, certificateRepo } = buildDeps();
    await certificateRepo.create(makeRevokedCert());
    const spy = vi.spyOn(certificateRepo, "update");

    await useCase.execute({
      certificateId: CERT_ID,
      reason: "another refund",
      revokedBy: "admin_01",
    });
    expect(spy).not.toHaveBeenCalled();
  });

  // ── 8. happy path (active → revoked) ──────────────────

  it("revokes an active cert on the happy path", async () => {
    const { useCase, certificateRepo } = buildDeps();
    await certificateRepo.create(makeActiveCert());

    const result = await useCase.execute({
      certificateId: CERT_ID,
      reason: "refund",
      revokedBy: "admin_01",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.wasAlreadyRevoked).toBe(false);
    expect(result.value.certificate.status).toBe("revoked");
    expect(result.value.certificate.revokedAt).toEqual(new Date("2026-07-19T00:00:00Z"));
    expect(result.value.certificate.revokedReason).toBe("refund");

    // The repo now returns the revoked cert on findById
    const persisted = await certificateRepo.findById(CERT_ID);
    expect(persisted.ok).toBe(true);
    if (!persisted.ok || !persisted.value) return;
    expect(persisted.value.status).toBe("revoked");
    expect(persisted.value.revokedReason).toBe("refund");
  });

  // ── 9. db_error on persist (db_error) ────────────────

  it("returns db_error when the update fails with db_error", async () => {
    const { useCase, certificateRepo } = buildDeps();
    await certificateRepo.create(makeActiveCert());
    vi.spyOn(certificateRepo, "update").mockResolvedValue({
      ok: false,
      error: { kind: "db_error", message: "transient" },
    } as never);

    const result = await useCase.execute({
      certificateId: CERT_ID,
      reason: "refund",
      revokedBy: "admin_01",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
    if (result.error.kind !== "db_error") return;
    expect(result.error.message).toBe("transient");
  });

  // ── 10. db_error on persist (not_found — race) ───────

  it("returns certificate_not_found when the update loses the cert (race)", async () => {
    // If the cert was deleted between findById and update, treat as
    // not_found. This is a documented edge case in the use case.
    const { useCase, certificateRepo } = buildDeps();
    await certificateRepo.create(makeActiveCert());
    vi.spyOn(certificateRepo, "update").mockResolvedValue({
      ok: false,
      error: { kind: "not_found" },
    } as never);

    const result = await useCase.execute({
      certificateId: CERT_ID,
      reason: "refund",
      revokedBy: "admin_01",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("certificate_not_found");
  });

  it("returns db_error with fallback when update returns a non-typed error", async () => {
    // Defensive: same as the findById fallback path. Future port
    // variants shouldn't crash the use case.
    const { useCase, certificateRepo } = buildDeps();
    await certificateRepo.create(makeActiveCert());
    vi.spyOn(certificateRepo, "update").mockResolvedValue({
      ok: false,
      error: { kind: "weird_future_error" as never },
    } as never);

    const result = await useCase.execute({
      certificateId: CERT_ID,
      reason: "refund",
      revokedBy: "admin_01",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
    if (result.error.kind !== "db_error") return;
    expect(result.error.message).toMatch(/Failed to persist revocation/i);
  });

  // ── 11. clock.now() is read for revokedAt ────────────

  it("uses the injected clock for revokedAt", async () => {
    const t0 = new Date("2026-07-19T12:00:00Z");
    const clock = new FixedClock(t0);
    const { useCase, certificateRepo } = buildDeps({ clock });
    await certificateRepo.create(makeActiveCert());

    const result = await useCase.execute({
      certificateId: CERT_ID,
      reason: "refund",
      revokedBy: "admin_01",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.certificate.revokedAt).toEqual(t0);

    // Advance the clock — the next call reads the advanced time.
    clock.advanceDays(7);
    const result2 = await useCase.execute({
      certificateId: "cert_02",
      reason: "fraud",
      revokedBy: "admin_01",
    });
    // cert_02 doesn't exist, so we just confirm the clock was read
    // at execute-time (not construction-time). The error path doesn't
    // call clock.now() — only the happy path does. We can verify by
    // looking at a successful path: create cert_02 first, then revoke.
    expect(result2.ok).toBe(false);
  });

  it("reads clock.now() at execute time, not construction time", async () => {
    const t0 = new Date("2026-07-19T12:00:00Z");
    const clock = new FixedClock(t0);
    const { useCase, certificateRepo } = buildDeps({ clock });
    // Create cert AFTER building the use case
    await certificateRepo.create(makeActiveCert({ id: "cert_late" }));
    clock.advanceDays(30); // advance BEFORE execute

    const result = await useCase.execute({
      certificateId: "cert_late",
      reason: "fraud",
      revokedBy: "admin_01",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.certificate.revokedAt).toEqual(
      new Date(t0.getTime() + 30 * 24 * 60 * 60 * 1000),
    );
  });

  // ── 12. reason is persisted on the cert ───────────────

  it("persists the reason on the revoked cert", async () => {
    const { useCase, certificateRepo } = buildDeps();
    await certificateRepo.create(makeActiveCert());
    const reason = "refund_processed_2026-07-19_order_xyz";

    const result = await useCase.execute({
      certificateId: CERT_ID,
      reason,
      revokedBy: "admin_01",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.certificate.revokedReason).toBe(reason);
  });

  it("preserves the original verificationHash and issuedAt", async () => {
    const issuedAt = new Date("2025-12-01T00:00:00Z");
    const { useCase, certificateRepo } = buildDeps();
    await certificateRepo.create(
      makeActiveCert({ issuedAt, verificationHash: "f".repeat(64) }),
    );

    const result = await useCase.execute({
      certificateId: CERT_ID,
      reason: "refund",
      revokedBy: "admin_01",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.certificate.issuedAt).toEqual(issuedAt);
    expect(result.value.certificate.verificationHash).toBe("f".repeat(64));
  });

  // ── 13. short-circuit on validation ───────────────────

  it("does NOT call findById when revokedBy is empty", async () => {
    const { useCase, certificateRepo } = buildDeps();
    const spy = vi.spyOn(certificateRepo, "findById");

    await useCase.execute({
      certificateId: CERT_ID,
      reason: "refund",
      revokedBy: "",
    });
    expect(spy).not.toHaveBeenCalled();
  });

  it("does NOT call findById when reason is empty (and revokedBy is set)", async () => {
    const { useCase, certificateRepo } = buildDeps();
    const spy = vi.spyOn(certificateRepo, "findById");

    await useCase.execute({
      certificateId: CERT_ID,
      reason: "",
      revokedBy: "admin_01",
    });
    expect(spy).not.toHaveBeenCalled();
  });
});

/**
 * Unit tests for InMemoryCertificateRepository.listAll (US-007).
 *
 * No pre-existing InMemoryCertificateRepository test file existed, so
 * this is the standalone test for the new method. Other methods are
 * exercised indirectly via the use-case tests in
 * tests/unit/usecases/{Issue,Revoke,Verify,Render}Certificate.test.ts.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryCertificateRepository } from "../InMemoryCertificateRepository";
import { createCertificate, type Certificate } from "@/domain/entities/Certificate";

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);
const HASH_C = "c".repeat(64);

function makeCert(
  overrides: Partial<{
    id: string;
    userId: string;
    courseId: string;
    verificationHash: string;
    issuedAt: Date;
    status: "active" | "revoked";
  }> = {},
): Certificate {
  const r = createCertificate({
    id: overrides.id ?? "cert-1",
    userId: overrides.userId ?? "u-1",
    courseId: overrides.courseId ?? "c-1",
    verificationHash: overrides.verificationHash ?? HASH_A,
    issuedAt: overrides.issuedAt ?? new Date("2025-01-01T00:00:00Z"),
  });
  if (!r.ok) throw new Error("makeCert failed: " + JSON.stringify(r.error));
  return overrides.status
    ? {
        ...r.value,
        status: overrides.status,
        revokedAt: overrides.status === "revoked" ? new Date() : null,
      }
    : r.value;
}

describe("InMemoryCertificateRepository.listAll", () => {
  let repo: InMemoryCertificateRepository;

  beforeEach(() => {
    repo = new InMemoryCertificateRepository();
  });

  it("returns an empty list when no certificates exist", async () => {
    const r = await repo.listAll();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toHaveLength(0);
  });

  it("returns every certificate, newest first", async () => {
    const c1 = makeCert({
      id: "cert-1",
      userId: "u-1",
      courseId: "c-1",
      issuedAt: new Date("2025-01-01T00:00:00Z"),
      verificationHash: HASH_A,
    });
    const c2 = makeCert({
      id: "cert-2",
      userId: "u-2",
      courseId: "c-2",
      issuedAt: new Date("2025-02-01T00:00:00Z"),
      verificationHash: HASH_B,
    });
    const c3 = makeCert({
      id: "cert-3",
      userId: "u-3",
      courseId: "c-3",
      issuedAt: new Date("2025-03-01T00:00:00Z"),
      verificationHash: HASH_C,
    });
    await repo.create(c1);
    await repo.create(c2);
    await repo.create(c3);

    const r = await repo.listAll();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.map((c) => c.id)).toEqual(["cert-3", "cert-2", "cert-1"]);
  });

  it("filters by status=active", async () => {
    const c1 = makeCert({ id: "cert-1", userId: "u-1", courseId: "c-1", verificationHash: HASH_A });
    const c2 = makeCert({
      id: "cert-2",
      userId: "u-2",
      courseId: "c-2",
      verificationHash: HASH_B,
      status: "revoked",
    });
    const c3 = makeCert({ id: "cert-3", userId: "u-3", courseId: "c-3", verificationHash: HASH_C });
    await repo.create(c1);
    await repo.create(c2);
    await repo.create(c3);

    const r = await repo.listAll({ status: "active" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.map((c) => c.id)).toEqual(["cert-1", "cert-3"]);
    expect(r.value.every((c) => c.status === "active")).toBe(true);
  });

  it("filters by status=revoked", async () => {
    const c1 = makeCert({ id: "cert-1", userId: "u-1", courseId: "c-1", verificationHash: HASH_A });
    const c2 = makeCert({
      id: "cert-2",
      userId: "u-2",
      courseId: "c-2",
      verificationHash: HASH_B,
      status: "revoked",
    });
    await repo.create(c1);
    await repo.create(c2);

    const r = await repo.listAll({ status: "revoked" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.map((c) => c.id)).toEqual(["cert-2"]);
  });
});

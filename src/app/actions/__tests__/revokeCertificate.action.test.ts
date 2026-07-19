/**
 * revokeCertificate.action.test.ts — TDD for the revokeCertificate
 * server action.
 *
 * The action is a thin shell:
 *  1. Authenticate via getSessionUserId (read the session cookie)
 *  2. Authorize: load the user, verify role === "ADMIN"
 *  3. Delegate to RevokeCertificate.execute
 *  4. Map the result to the action's discriminated-union error shape
 *
 * Per strict TDD, the testable pure logic is extracted to
 * `performRevokeCertificate`, which takes the user-lookup function
 * as a dependency. The action wrapper handles the framework.
 *
 * What we test:
 *  - returns unauthorized when getSessionUserId returns null
 *  - returns unauthorized when the user doesn't exist
 *  - returns unauthorized when the user is not ADMIN
 *  - returns invalid_reason when the reason is empty (or too long)
 *  - returns certificate_not_found when the use case says so
 *  - returns db_error when the use case says so
 *  - returns success with wasAlreadyRevoked === false on first revoke
 *  - returns success with wasAlreadyRevoked === true on re-revoke
 *  - calls the use case with revokedBy = current user's id
 *
 * TDD: this test is written FIRST. Run it — it will fail (the
 * performRevokeCertificate function doesn't exist). Then extract it
 * from revokeCertificate.action.ts.
 */

import { describe, it, expect, vi, type Mock } from "vitest";
import { Result } from "@/domain/shared/Result";

// Mock server-only so we can import src/lib/auth.ts
vi.mock("server-only", () => ({}));

// Mock next/headers + next/navigation so the action's framework
// imports don't blow up.
vi.mock("next/headers", () => ({
  cookies: () =>
    Promise.resolve({
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    }),
}));

import { performRevokeCertificate } from "../revokeCertificate.action";
import { buildTestContainer } from "@/composition/container.test";
import type { UserRepository } from "@/ports/repositories/UserRepository";

// ── Helpers ─────────────────────────────────────────────────

type GetCurrentUserFn = (
  container: { userRepo: UserRepository },
) => Promise<{ id: string; role: "STUDENT" | "INSTRUCTOR" | "ADMIN" } | null>;

function makeGetCurrentUser(
  returnValue: { id: string; role: "STUDENT" | "INSTRUCTOR" | "ADMIN" } | null,
): GetCurrentUserFn {
  return async () => returnValue;
}

async function seedAdmin(container: ReturnType<typeof buildTestContainer>, id = "u-admin-1") {
  await container.userRepo.create({
    id,
    email: `${id}@test.example.com`,
    passwordHash: "placeholder",
    firstName: "Admin",
    lastName: "User",
  });
  // Bump the role to ADMIN (the repo's create() hardcodes STUDENT).
  const repo = container.userRepo as unknown as { users: Map<string, { role: string }> };
  const existing = repo.users.get(id);
  if (existing) {
    repo.users.set(id, { ...existing, role: "ADMIN" });
  }
}

async function seedStudent(container: ReturnType<typeof buildTestContainer>, id = "u-student-1") {
  await container.userRepo.create({
    id,
    email: `${id}@test.example.com`,
    passwordHash: "placeholder",
    firstName: "Student",
    lastName: "User",
  });
  // The repo's create() default role is STUDENT — no override needed.
}

async function seedCertificate(
  container: ReturnType<typeof buildTestContainer>,
  id = "cert-1",
) {
  await container.certificateRepo.create({
    id,
    userId: "u-other",
    courseId: "course-1",
    issuedAt: new Date(),
    verificationHash: `hash-${id}`,
    revokedAt: null,
    revokedReason: null,
    status: "active",
  });
}

// ── Tests ───────────────────────────────────────────────────

describe("performRevokeCertificate", () => {
  it("returns unauthorized when getCurrentUser returns null (no session)", async () => {
    const container = buildTestContainer();
    const getCurrentUser = makeGetCurrentUser(null);
    const result = await performRevokeCertificate(
      container,
      { certificateId: "cert-1", reason: "Refund processed" },
      getCurrentUser,
    );
    expect(result).toEqual({ ok: false, error: { kind: "unauthorized" } });
  });

  it("returns unauthorized when the user no longer exists in the DB", async () => {
    const container = buildTestContainer();
    // getCurrentUser claims id=u-ghost but the user doesn't exist
    const getCurrentUser = makeGetCurrentUser({ id: "u-ghost", role: "ADMIN" });
    const result = await performRevokeCertificate(
      container,
      { certificateId: "cert-1", reason: "Refund processed" },
      getCurrentUser,
    );
    expect(result).toEqual({ ok: false, error: { kind: "unauthorized" } });
  });

  it("returns unauthorized when the user is not ADMIN", async () => {
    const container = buildTestContainer();
    await seedStudent(container, "u-student-1");
    const getCurrentUser = makeGetCurrentUser({ id: "u-student-1", role: "STUDENT" });
    const result = await performRevokeCertificate(
      container,
      { certificateId: "cert-1", reason: "Refund processed" },
      getCurrentUser,
    );
    expect(result).toEqual({ ok: false, error: { kind: "unauthorized" } });
  });

  it("returns invalid_reason when the reason is empty", async () => {
    const container = buildTestContainer();
    await seedAdmin(container, "u-admin-1");
    const getCurrentUser = makeGetCurrentUser({ id: "u-admin-1", role: "ADMIN" });
    const result = await performRevokeCertificate(
      container,
      { certificateId: "cert-1", reason: "" },
      getCurrentUser,
    );
    expect(result).toEqual({ ok: false, error: { kind: "invalid_reason" } });
  });

  it("returns invalid_reason when the reason is only whitespace", async () => {
    const container = buildTestContainer();
    await seedAdmin(container, "u-admin-1");
    const getCurrentUser = makeGetCurrentUser({ id: "u-admin-1", role: "ADMIN" });
    const result = await performRevokeCertificate(
      container,
      { certificateId: "cert-1", reason: "   \t  " },
      getCurrentUser,
    );
    expect(result).toEqual({ ok: false, error: { kind: "invalid_reason" } });
  });

  it("returns certificate_not_found when the use case says so", async () => {
    const container = buildTestContainer();
    await seedAdmin(container, "u-admin-1");
    const getCurrentUser = makeGetCurrentUser({ id: "u-admin-1", role: "ADMIN" });
    const result = await performRevokeCertificate(
      container,
      { certificateId: "nonexistent-cert", reason: "Refund processed" },
      getCurrentUser,
    );
    expect(result).toEqual({ ok: false, error: { kind: "certificate_not_found" } });
  });

  it("returns db_error when the use case says so", async () => {
    const container = buildTestContainer();
    await seedAdmin(container, "u-admin-1");
    const getCurrentUser = makeGetCurrentUser({ id: "u-admin-1", role: "ADMIN" });
    // Force the certificate repo to throw a db_error
    const realFindById = container.certificateRepo.findById.bind(container.certificateRepo);
    container.certificateRepo.findById = vi.fn(async () => {
      return Result.err({ kind: "db_error", message: "simulated DB failure" });
    }) as typeof realFindById;
    void realFindById;
    const result = await performRevokeCertificate(
      container,
      { certificateId: "cert-1", reason: "Refund processed" },
      getCurrentUser,
    );
    expect(result).toMatchObject({ ok: false, error: { kind: "db_error" } });
  });

  it("returns success with wasAlreadyRevoked=false on first revoke", async () => {
    const container = buildTestContainer();
    await seedAdmin(container, "u-admin-1");
    await seedCertificate(container, "cert-1");
    const getCurrentUser = makeGetCurrentUser({ id: "u-admin-1", role: "ADMIN" });
    const result = await performRevokeCertificate(
      container,
      { certificateId: "cert-1", reason: "Refund processed" },
      getCurrentUser,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.certificateId).toBe("cert-1");
      expect(result.value.wasAlreadyRevoked).toBe(false);
    }
  });

  it("returns success with wasAlreadyRevoked=true on re-revoke", async () => {
    const container = buildTestContainer();
    await seedAdmin(container, "u-admin-1");
    await seedCertificate(container, "cert-1");
    const getCurrentUser = makeGetCurrentUser({ id: "u-admin-1", role: "ADMIN" });
    // First revoke
    await performRevokeCertificate(
      container,
      { certificateId: "cert-1", reason: "Refund processed" },
      getCurrentUser,
    );
    // Second revoke (idempotent)
    const result = await performRevokeCertificate(
      container,
      { certificateId: "cert-1", reason: "Re-assert" },
      getCurrentUser,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.certificateId).toBe("cert-1");
      expect(result.value.wasAlreadyRevoked).toBe(true);
    }
  });

  it("maps invalid_revoked_by from the use case to invalid_reason (unreachable in practice)", async () => {
    // The action's contract maps invalid_revoked_by → invalid_reason.
    // The use case's invalid_revoked_by branch is unreachable in
    // practice (we always pass the session user's id, which is
    // non-empty by construction), but the action defends against it
    // so a future refactor doesn't expose the raw error.
    const container = buildTestContainer();
    await seedAdmin(container, "u-admin-1");
    await seedCertificate(container, "cert-1");
    const getCurrentUser = makeGetCurrentUser({ id: "u-admin-1", role: "ADMIN" });
    // Force the use case to return invalid_revoked_by
    vi.spyOn(container.revokeCertificate, "execute").mockResolvedValueOnce(
      Result.err({ kind: "invalid_revoked_by" }),
    );
    const result = await performRevokeCertificate(
      container,
      { certificateId: "cert-1", reason: "Refund processed" },
      getCurrentUser,
    );
    expect(result).toEqual({ ok: false, error: { kind: "invalid_reason" } });
  });

  it("calls the use case with revokedBy = current user's id", async () => {
    const container = buildTestContainer();
    await seedAdmin(container, "u-admin-X");
    await seedCertificate(container, "cert-1");
    const getCurrentUser = makeGetCurrentUser({ id: "u-admin-X", role: "ADMIN" });
    // Spy on the use case's execute method (container.revokeCertificate
    // is an instance of RevokeCertificate; we want to verify the
    // execute() call is wired correctly).
    const spy = vi.spyOn(container.revokeCertificate, "execute");
    const result = await performRevokeCertificate(
      container,
      { certificateId: "cert-1", reason: "Refund processed" },
      getCurrentUser,
    );
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        certificateId: "cert-1",
        reason: "Refund processed",
        revokedBy: "u-admin-X",
      }),
    );
    expect(result.ok).toBe(true);
  });
});

// Suppress the unused-import warning for Mock
void (null as unknown as Mock);

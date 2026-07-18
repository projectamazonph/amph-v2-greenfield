/**
 * revokeCertificateAction server action tests.
 *
 * STORY-044: RevokeCertificate on refund + revocation badge.
 *
 * Mocks:
 *  - next/headers cookies() — controlled per test
 *  - @/composition container — controlled per test
 *  - env JWT_SECRET — set in beforeAll
 *
 * Pattern note: server actions in this codebase are thin wrappers
 * over use cases. The meaningful logic is in the use case (covered
 * in RevokeCertificate.test.ts). These tests cover the
 * action-specific contract: auth, role check, error mapping.
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";

// ── Hoisted mocks ──────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  cookiesGet: vi.fn(),
  buildContainer: vi.fn(),
  jwtVerify: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: mocks.cookiesGet,
  }),
}));

vi.mock("@/composition/container", () => ({
  buildContainer: () => mocks.buildContainer(),
}));

vi.mock("@/infra/security/JoseJwtService", () => ({
  JoseJwtService: class {
    constructor(_secret: string) {}
    verify = mocks.jwtVerify;
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// ── Imports (must come after mocks) ───────────────────────────────────────

import { revokeCertificateAction } from "@/app/actions/revokeCertificate.action";
import { Result } from "@/domain/shared/Result";
import type { Certificate } from "@/domain/entities/Certificate";
import type { User } from "@/domain/entities/User";

// ── Setup ──────────────────────────────────────────────────────────────────

beforeAll(() => {
  process.env.JWT_SECRET = "test-secret-at-least-32-bytes-long-please";
});

beforeEach(() => {
  mocks.cookiesGet.mockReset();
  mocks.jwtVerify.mockReset();
  mocks.buildContainer.mockReset();
});

// ── Helpers ────────────────────────────────────────────────────────────────

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user_admin_01",
    email: "admin@example.com",
    firstName: "Admin",
    lastName: "User",
    role: "ADMIN",
    subscriptionTier: "FREE",
    verificationStatus: "VERIFIED",
    enrolledCourseIds: [],
    totalXp: 0,
    avatarUrl: null,
    bio: null,
    emailVerificationToken: null,
    emailVerifiedAt: null,
    paymongoCustomerId: null,
    paymongoDefaultPaymentMethod: null,
    passwordChangedAt: null,
    failedLoginCount: 0,
    lockedUntil: null,
    simulatorAccess: "NONE",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    deletedAt: null,
    ...overrides,
  } as User;
}

function makeCert(): Certificate {
  return {
    id: "cert_01",
    userId: "user_01",
    courseId: "course_01",
    verificationHash: "a".repeat(64),
    issuedAt: new Date("2026-07-01T00:00:00Z"),
    revokedAt: null,
    revokedReason: null,
    status: "active",
  };
}

function buildContainer(overrides: {
  user?: User | null;
  userError?: { kind: "not_found" } | { kind: "db_error"; message: string };
  revokeResult?: Result<
    { certificate: Certificate; wasAlreadyRevoked: boolean },
    | { kind: "certificate_not_found" }
    | { kind: "invalid_reason" }
    | { kind: "invalid_revoked_by" }
    | { kind: "db_error"; message: string }
  >;
} = {}) {
  const user = overrides.user !== undefined ? overrides.user : makeUser();
  const userResult: Result<User, { kind: "not_found" } | { kind: "db_error"; message: string }> =
    overrides.userError
      ? (Result.err(overrides.userError) as unknown as Result<User, { kind: "not_found" } | { kind: "db_error"; message: string }>)
      : (Result.ok(user) as unknown as Result<User, { kind: "not_found" } | { kind: "db_error"; message: string }>);

  const revokeResult =
    overrides.revokeResult ??
    (Result.ok({ certificate: makeCert(), wasAlreadyRevoked: false }) as unknown as Result<
      { certificate: Certificate; wasAlreadyRevoked: boolean },
      | { kind: "certificate_not_found" }
      | { kind: "invalid_reason" }
      | { kind: "invalid_revoked_by" }
      | { kind: "db_error"; message: string }
    >);

  return {
    userRepo: {
      findById: vi.fn(async () => userResult),
    },
    revokeCertificate: {
      execute: vi.fn(async () => revokeResult),
    },
  };
}

function setSession(sub: string | null) {
  if (sub === null) {
    mocks.cookiesGet.mockReturnValue(undefined);
    return;
  }
  mocks.cookiesGet.mockReturnValue({ value: "valid.jwt.token" });
  mocks.jwtVerify.mockResolvedValue(
    sub ? { ok: true, value: { sub } } : { ok: false, error: { kind: "verify_error" } },
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("revokeCertificateAction", () => {
  it("returns unauthorized when no session cookie is present", async () => {
    setSession(null);
    const container = buildContainer();
    mocks.buildContainer.mockReturnValue(container);

    const result = await revokeCertificateAction({
      certificateId: "cert_01",
      reason: "fraud",
    });

    expect(result).toEqual({ ok: false, error: { kind: "unauthorized" } });
    expect(container.revokeCertificate.execute).not.toHaveBeenCalled();
  });

  it("returns unauthorized when the JWT is invalid", async () => {
    mocks.cookiesGet.mockReturnValue({ value: "bad.jwt.token" });
    mocks.jwtVerify.mockResolvedValue({ ok: false, error: { kind: "verify_error" } });
    const container = buildContainer();
    mocks.buildContainer.mockReturnValue(container);

    const result = await revokeCertificateAction({
      certificateId: "cert_01",
      reason: "fraud",
    });

    expect(result).toEqual({ ok: false, error: { kind: "unauthorized" } });
    expect(container.revokeCertificate.execute).not.toHaveBeenCalled();
  });

  it("returns unauthorized when the session user is not found", async () => {
    setSession("user_admin_01");
    const container = buildContainer({ userError: { kind: "not_found" } });
    mocks.buildContainer.mockReturnValue(container);

    const result = await revokeCertificateAction({
      certificateId: "cert_01",
      reason: "fraud",
    });

    expect(result).toEqual({ ok: false, error: { kind: "unauthorized" } });
  });

  it("returns unauthorized when the user is not an admin", async () => {
    setSession("user_student_01");
    const container = buildContainer({ user: makeUser({ role: "STUDENT" }) });
    mocks.buildContainer.mockReturnValue(container);

    const result = await revokeCertificateAction({
      certificateId: "cert_01",
      reason: "fraud",
    });

    expect(result).toEqual({ ok: false, error: { kind: "unauthorized" } });
    expect(container.revokeCertificate.execute).not.toHaveBeenCalled();
  });

  it("delegates to the use case with the admin's userId as revokedBy", async () => {
    setSession("user_admin_01");
    const container = buildContainer();
    mocks.buildContainer.mockReturnValue(container);

    await revokeCertificateAction({
      certificateId: "cert_01",
      reason: "fraud",
    });

    expect(container.revokeCertificate.execute).toHaveBeenCalledWith({
      certificateId: "cert_01",
      reason: "fraud",
      revokedBy: "user_admin_01",
    });
  });

  it("returns the cert id and wasAlreadyRevoked flag on success", async () => {
    setSession("user_admin_01");
    const container = buildContainer({
      revokeResult: Result.ok({ certificate: makeCert(), wasAlreadyRevoked: true }) as unknown as Result<
        { certificate: Certificate; wasAlreadyRevoked: boolean },
        | { kind: "certificate_not_found" }
        | { kind: "invalid_reason" }
        | { kind: "invalid_revoked_by" }
        | { kind: "db_error"; message: string }
      >,
    });
    mocks.buildContainer.mockReturnValue(container);

    const result = await revokeCertificateAction({
      certificateId: "cert_01",
      reason: "fraud",
    });

    expect(result).toEqual({
      ok: true,
      value: { certificateId: "cert_01", wasAlreadyRevoked: true },
    });
  });

  it("maps certificate_not_found from the use case", async () => {
    setSession("user_admin_01");
    const container = buildContainer({
      revokeResult: Result.err({ kind: "certificate_not_found" }) as unknown as Result<
        { certificate: Certificate; wasAlreadyRevoked: boolean },
        | { kind: "certificate_not_found" }
        | { kind: "invalid_reason" }
        | { kind: "invalid_revoked_by" }
        | { kind: "db_error"; message: string }
      >,
    });
    mocks.buildContainer.mockReturnValue(container);

    const result = await revokeCertificateAction({
      certificateId: "missing",
      reason: "fraud",
    });

    expect(result).toEqual({ ok: false, error: { kind: "certificate_not_found" } });
  });

  it("maps invalid_reason from the use case", async () => {
    setSession("user_admin_01");
    const container = buildContainer({
      revokeResult: Result.err({ kind: "invalid_reason" }) as unknown as Result<
        { certificate: Certificate; wasAlreadyRevoked: boolean },
        | { kind: "certificate_not_found" }
        | { kind: "invalid_reason" }
        | { kind: "invalid_revoked_by" }
        | { kind: "db_error"; message: string }
      >,
    });
    mocks.buildContainer.mockReturnValue(container);

    const result = await revokeCertificateAction({
      certificateId: "cert_01",
      reason: "",
    });

    expect(result).toEqual({ ok: false, error: { kind: "invalid_reason" } });
  });

  it("maps invalid_revoked_by to invalid_reason (unreachable in practice)", async () => {
    setSession("user_admin_01");
    const container = buildContainer({
      revokeResult: Result.err({ kind: "invalid_revoked_by" }) as unknown as Result<
        { certificate: Certificate; wasAlreadyRevoked: boolean },
        | { kind: "certificate_not_found" }
        | { kind: "invalid_reason" }
        | { kind: "invalid_revoked_by" }
        | { kind: "db_error"; message: string }
      >,
    });
    mocks.buildContainer.mockReturnValue(container);

    const result = await revokeCertificateAction({
      certificateId: "cert_01",
      reason: "fraud",
    });

    expect(result).toEqual({ ok: false, error: { kind: "invalid_reason" } });
  });

  it("passes through db_error from the use case", async () => {
    setSession("user_admin_01");
    const container = buildContainer({
      revokeResult: Result.err({ kind: "db_error", message: "disk full" }) as unknown as Result<
        { certificate: Certificate; wasAlreadyRevoked: boolean },
        | { kind: "certificate_not_found" }
        | { kind: "invalid_reason" }
        | { kind: "invalid_revoked_by" }
        | { kind: "db_error"; message: string }
      >,
    });
    mocks.buildContainer.mockReturnValue(container);

    const result = await revokeCertificateAction({
      certificateId: "cert_01",
      reason: "fraud",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
    if (result.error.kind !== "db_error") return;
    expect(result.error.message).toBe("disk full");
  });
});

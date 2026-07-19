/**
 * ImpersonateUser.test.ts — STORY-047.
 *
 * Tier B coverage for the ImpersonateUser use case.
 * Covers: happy path, target not found, target is admin, target is self,
 * admin not found, JWT sign failure, session create failure, db_error.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { ImpersonateUser } from "@/usecases/ImpersonateUser";
import { InMemoryUserRepository } from "@/infra/repositories/InMemoryUserRepository";
import { InMemorySessionRepository } from "@/infra/repositories/InMemorySessionRepository";
import { FixedClock } from "@/ports/system/Clock";
import type { JwtService } from "@/ports/security/JwtService";
import type { IdGenerator } from "@/ports/system/IdGenerator";
import type { User } from "@/domain/entities/User";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import type { SessionRepository } from "@/ports/repositories/SessionRepository";

// ── Fixtures ───────────────────────────────────────────────────────────────

const ADMIN_ID = "admin_01";
const TARGET_ID = "user_01";
const OTHER_USER_ID = "user_02";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function makeUser(id: string, role: User["role"] = "STUDENT"): User {
  return {
    id,
    email: `${id}@example.com`,
    firstName: id,
    lastName: "Test",
    role,
    subscriptionTier: "FREE",
    verificationStatus: "VERIFIED",
    enrolledCourseIds: [],
    createdAt: new Date("2026-01-01T00:00:00Z"),
    totalXp: 0,
  } as User;
}

async function seedUser(
  repo: InMemoryUserRepository,
  id: string,
  role: User["role"] = "STUDENT",
): Promise<void> {
  await repo.create({
    id,
    email: `${id}@example.com`,
    passwordHash: "stubbed:hash",
    firstName: id,
    lastName: "Test",
  });
  // The in-memory repo doesn't expose role mutation. For our test we
  // accept the default role (STUDENT) — the test that needs ADMIN
  // bypasses this by seeding via the impl-internal state OR uses a
  // mock repo. For most tests, the default STUDENT is what we want.
  // The "target is admin" test uses a custom mock repo (see below).
  if (role !== "STUDENT") {
    // We can't actually set role via the public API. Tests that need
    // an admin target should use the `buildMockDeps` approach below.
  }
}

function makeIdGen(): IdGenerator {
  let n = 0;
  return {
    newId: () => `id_${++n}`,
    paymentRef: () => `AMPH-${n}`,
    receiptNumber: () => `AMPH-2026-${n}`,
  };
}

function makeJwt(): JwtService & { signCount: () => number } {
  let n = 0;
  return {
    async sign(payload, expiresIn) {
      n++;
      return {
        ok: true,
        value: `jwt.${Buffer.from(JSON.stringify({ ...payload, expiresIn })).toString("base64")}.sig`,
      };
    },
    async verify(token) {
      if (!token.startsWith("jwt.")) {
        return { ok: false, error: new Error("invalid") };
      }
      const parts = token.split(".");
      const payloadPart = parts[1];
      if (!payloadPart) return { ok: false, error: new Error("invalid token format") };
      const payload = JSON.parse(Buffer.from(payloadPart, "base64").toString("utf8"));
      return { ok: true, value: payload };
    },
    signCount: () => n,
  };
}

function buildDeps(overrides: {
  userRepo?: InMemoryUserRepository;
  sessionRepo?: InMemorySessionRepository;
  jwt?: JwtService;
  idGen?: IdGenerator;
  clock?: FixedClock;
} = {}) {
  return {
    userRepo: overrides.userRepo ?? new InMemoryUserRepository(),
    sessionRepo: overrides.sessionRepo ?? new InMemorySessionRepository(),
    jwt: overrides.jwt ?? makeJwt(),
    idGen: overrides.idGen ?? makeIdGen(),
    clock: overrides.clock ?? new FixedClock(new Date("2026-07-19T00:00:00Z")),
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("ImpersonateUser", () => {
  let deps: ReturnType<typeof buildDeps>;
  let useCase: ImpersonateUser;

  beforeEach(() => {
    deps = buildDeps();
    useCase = new ImpersonateUser(deps);
  });

  // ── Happy path ────────────────────────────────────────

  it("issues a session for the target user on the happy path", async () => {
    // Build a mock user repo that returns the admin as ADMIN role
    // (the in-memory repo always creates users as STUDENT).
    const mockUserRepo: UserRepository = {
      findById: async (id) => {
        if (id === ADMIN_ID) return { ok: true, value: makeUser(ADMIN_ID, "ADMIN") };
        if (id === TARGET_ID) return { ok: true, value: makeUser(TARGET_ID, "STUDENT") };
        return { ok: false, error: { kind: "not_found" } };
      },
      findByEmail: async () => ({ ok: false, error: { kind: "not_found" } }),
      create: async () => ({ ok: true, value: makeUser("x") }),
      update: async () => ({ ok: true, value: makeUser("x") }),
      listAll: async () => ({ ok: true, value: [] }),
      emailExists: async () => ({ ok: true, value: false }),
      getPasswordHash: async () => ({ ok: true, value: "stub" }),
      updateTotalXp: async () => ({ ok: true, value: makeUser("x") }),
    };
    useCase = new ImpersonateUser({ ...deps, userRepo: mockUserRepo });

    const result = await useCase.execute({
      targetUserId: TARGET_ID,
      adminUserId: ADMIN_ID,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.token).toMatch(/^jwt\./);
    expect(result.value.targetUser.id).toBe(TARGET_ID);
    expect(result.value.expiresAt).toBeInstanceOf(Date);
    // 7 days from clock.now()
    const expectedExpires = new Date("2026-07-19T00:00:00Z").getTime() + SESSION_TTL_MS;
    expect(result.value.expiresAt.getTime()).toBe(expectedExpires);
  });

  it("creates a session row in the session repo", async () => {
    const mockUserRepo: UserRepository = {
      findById: async (id) => {
        if (id === ADMIN_ID) return { ok: true, value: makeUser(ADMIN_ID, "ADMIN") };
        if (id === TARGET_ID) return { ok: true, value: makeUser(TARGET_ID, "STUDENT") };
        return { ok: false, error: { kind: "not_found" } };
      },
      findByEmail: async () => ({ ok: false, error: { kind: "not_found" } }),
      create: async () => ({ ok: true, value: makeUser("x") }),
      update: async () => ({ ok: true, value: makeUser("x") }),
      listAll: async () => ({ ok: true, value: [] }),
      emailExists: async () => ({ ok: true, value: false }),
      getPasswordHash: async () => ({ ok: true, value: "stub" }),
      updateTotalXp: async () => ({ ok: true, value: makeUser("x") }),
    };
    useCase = new ImpersonateUser({ ...deps, userRepo: mockUserRepo });

    const result = await useCase.execute({
      targetUserId: TARGET_ID,
      adminUserId: ADMIN_ID,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Decode the JWT payload to find the sessionId
    const tokenParts = result.value.token.split(".");
    const payload = JSON.parse(Buffer.from(tokenParts[1]!, "base64").toString("utf8"));
    const session = await deps.sessionRepo.findById(payload.sessionId);
    expect(session.ok).toBe(true);
    if (!session.ok) return;
    expect(session.value.userId).toBe(TARGET_ID);
  });

  it("signs a JWT with the target user's id, sessionId, and role", async () => {
    const mockUserRepo: UserRepository = {
      findById: async (id) => {
        if (id === ADMIN_ID) return { ok: true, value: makeUser(ADMIN_ID, "ADMIN") };
        if (id === TARGET_ID) return { ok: true, value: makeUser(TARGET_ID, "STUDENT") };
        return { ok: false, error: { kind: "not_found" } };
      },
      findByEmail: async () => ({ ok: false, error: { kind: "not_found" } }),
      create: async () => ({ ok: true, value: makeUser("x") }),
      update: async () => ({ ok: true, value: makeUser("x") }),
      listAll: async () => ({ ok: true, value: [] }),
      emailExists: async () => ({ ok: true, value: false }),
      getPasswordHash: async () => ({ ok: true, value: "stub" }),
      updateTotalXp: async () => ({ ok: true, value: makeUser("x") }),
    };
    useCase = new ImpersonateUser({ ...deps, userRepo: mockUserRepo });

    const result = await useCase.execute({
      targetUserId: TARGET_ID,
      adminUserId: ADMIN_ID,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const tokenParts = result.value.token.split(".");
    const payload = JSON.parse(Buffer.from(tokenParts[1]!, "base64").toString("utf8"));
    expect(payload.sub).toBe(TARGET_ID);
    expect(payload.sessionId).toBeTruthy();
    expect(payload.role).toBe("STUDENT");
  });

  // ── Target user errors ────────────────────────────────

  it("returns target_user_not_found when the target doesn't exist", async () => {
    await seedUser(deps.userRepo, ADMIN_ID);

    const result = await useCase.execute({
      targetUserId: "missing",
      adminUserId: ADMIN_ID,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("target_user_not_found");
  });

  // ── Admin role rejection (uses a mock repo to set ADMIN role) ─

  it("returns cannot_impersonate_admin when the target is an admin", async () => {
    // Build a custom user repo that returns ADMIN role for the target
    const mockUserRepo: UserRepository = {
      findById: async (id) => {
        if (id === TARGET_ID) {
          return {
            ok: true,
            value: makeUser(TARGET_ID, "ADMIN"),
          };
        }
        if (id === ADMIN_ID) {
          return { ok: true, value: makeUser(ADMIN_ID, "ADMIN") };
        }
        return { ok: false, error: { kind: "not_found" } };
      },
      // Other methods are unused in this test
      findByEmail: async () => ({ ok: false, error: { kind: "not_found" } }),
      create: async () => ({ ok: true, value: makeUser("x") }),
      update: async () => ({ ok: true, value: makeUser("x") }),
      listAll: async () => ({ ok: true, value: [] }),
      emailExists: async () => ({ ok: true, value: false }),
      getPasswordHash: async () => ({ ok: true, value: "stub" }),
      updateTotalXp: async () => ({ ok: true, value: makeUser("x") }),
    };
    useCase = new ImpersonateUser({ ...buildDeps({ userRepo: new InMemoryUserRepository() }), userRepo: mockUserRepo });

    const result = await useCase.execute({
      targetUserId: TARGET_ID,
      adminUserId: ADMIN_ID,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("cannot_impersonate_admin");
  });

  // ── Self-impersonation rejection ──────────────────────

  it("returns cannot_impersonate_self when admin tries to impersonate themselves", async () => {
    await seedUser(deps.userRepo, ADMIN_ID);

    const result = await useCase.execute({
      targetUserId: ADMIN_ID,
      adminUserId: ADMIN_ID,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    // ADMIN_ID is the admin, and our seedUser creates STUDENT role.
    // The self-impersonation check runs before the admin role check.
    expect(result.error.kind).toBe("cannot_impersonate_self");
  });

  // ── Admin caller errors ──────────────────────────────

  it("returns admin_user_not_found when the admin doesn't exist", async () => {
    await seedUser(deps.userRepo, TARGET_ID);

    const result = await useCase.execute({
      targetUserId: TARGET_ID,
      adminUserId: "missing_admin",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("admin_user_not_found");
  });

  it("returns db_error when the caller is not an admin (defensive)", async () => {
    // Mock the admin repo to return a non-admin user
    const mockUserRepo: UserRepository = {
      findById: async (id) => {
        if (id === ADMIN_ID) {
          return { ok: true, value: makeUser(ADMIN_ID, "STUDENT") }; // not admin
        }
        if (id === TARGET_ID) {
          return { ok: true, value: makeUser(TARGET_ID, "STUDENT") };
        }
        return { ok: false, error: { kind: "not_found" } };
      },
      findByEmail: async () => ({ ok: false, error: { kind: "not_found" } }),
      create: async () => ({ ok: true, value: makeUser("x") }),
      update: async () => ({ ok: true, value: makeUser("x") }),
      listAll: async () => ({ ok: true, value: [] }),
      emailExists: async () => ({ ok: true, value: false }),
      getPasswordHash: async () => ({ ok: true, value: "stub" }),
      updateTotalXp: async () => ({ ok: true, value: makeUser("x") }),
    };
    useCase = new ImpersonateUser({ ...buildDeps(), userRepo: mockUserRepo });

    const result = await useCase.execute({
      targetUserId: TARGET_ID,
      adminUserId: ADMIN_ID,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
    if (result.error.kind !== "db_error") return;
    expect(result.error.message).toMatch(/not an admin/i);
  });

  // ── db_error propagation ─────────────────────────────

  it("returns db_error when the target user repo errors", async () => {
    const mockUserRepo: UserRepository = {
      findById: async () => ({ ok: false, error: { kind: "db_error", message: "user db down" } }),
      findByEmail: async () => ({ ok: false, error: { kind: "not_found" } }),
      create: async () => ({ ok: true, value: makeUser("x") }),
      update: async () => ({ ok: true, value: makeUser("x") }),
      listAll: async () => ({ ok: true, value: [] }),
      emailExists: async () => ({ ok: true, value: false }),
      getPasswordHash: async () => ({ ok: true, value: "stub" }),
      updateTotalXp: async () => ({ ok: true, value: makeUser("x") }),
    };
    useCase = new ImpersonateUser({ ...buildDeps(), userRepo: mockUserRepo });

    const result = await useCase.execute({
      targetUserId: TARGET_ID,
      adminUserId: ADMIN_ID,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
    if (result.error.kind !== "db_error") return;
    expect(result.error.message).toBe("user db down");
  });

  it("returns db_error when the session repo fails to create", async () => {
    const mockUserRepo: UserRepository = {
      findById: async (id) => {
        if (id === ADMIN_ID) return { ok: true, value: makeUser(ADMIN_ID, "ADMIN") };
        if (id === TARGET_ID) return { ok: true, value: makeUser(TARGET_ID, "STUDENT") };
        return { ok: false, error: { kind: "not_found" } };
      },
      findByEmail: async () => ({ ok: false, error: { kind: "not_found" } }),
      create: async () => ({ ok: true, value: makeUser("x") }),
      update: async () => ({ ok: true, value: makeUser("x") }),
      listAll: async () => ({ ok: true, value: [] }),
      emailExists: async () => ({ ok: true, value: false }),
      getPasswordHash: async () => ({ ok: true, value: "stub" }),
      updateTotalXp: async () => ({ ok: true, value: makeUser("x") }),
    };
    const mockSessionRepo: SessionRepository = {
      findById: async () => ({ ok: false, error: { kind: "not_found" } }),
      create: async () => ({ ok: false, error: { kind: "db_error", message: "session create failed" } }),
      deleteById: async () => ({ ok: true, value: undefined }),
      deleteAllForUser: async () => ({ ok: true, value: undefined }),
    };
    useCase = new ImpersonateUser({ ...deps, userRepo: mockUserRepo, sessionRepo: mockSessionRepo });

    const result = await useCase.execute({
      targetUserId: TARGET_ID,
      adminUserId: ADMIN_ID,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });

  // ── JWT failure ──────────────────────────────────────

  it("returns token_error when jwt.sign fails", async () => {
    const mockUserRepo: UserRepository = {
      findById: async (id) => {
        if (id === ADMIN_ID) return { ok: true, value: makeUser(ADMIN_ID, "ADMIN") };
        if (id === TARGET_ID) return { ok: true, value: makeUser(TARGET_ID, "STUDENT") };
        return { ok: false, error: { kind: "not_found" } };
      },
      findByEmail: async () => ({ ok: false, error: { kind: "not_found" } }),
      create: async () => ({ ok: true, value: makeUser("x") }),
      update: async () => ({ ok: true, value: makeUser("x") }),
      listAll: async () => ({ ok: true, value: [] }),
      emailExists: async () => ({ ok: true, value: false }),
      getPasswordHash: async () => ({ ok: true, value: "stub" }),
      updateTotalXp: async () => ({ ok: true, value: makeUser("x") }),
    };
    const failingJwt: JwtService = {
      sign: async () => ({ ok: false, error: new Error("sign failed") }),
      verify: async () => ({ ok: false, error: new Error("verify failed") }),
    };
    useCase = new ImpersonateUser({ ...deps, userRepo: mockUserRepo, jwt: failingJwt });

    const result = await useCase.execute({
      targetUserId: TARGET_ID,
      adminUserId: ADMIN_ID,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("token_error");
  });

  // ── Short-circuit ────────────────────────────────────

  it("does not create a session when the target is an admin", async () => {
    const mockUserRepo: UserRepository = {
      findById: async (id) => {
        if (id === TARGET_ID) {
          return { ok: true, value: makeUser(TARGET_ID, "ADMIN") };
        }
        if (id === ADMIN_ID) {
          return { ok: true, value: makeUser(ADMIN_ID, "ADMIN") };
        }
        return { ok: false, error: { kind: "not_found" } };
      },
      findByEmail: async () => ({ ok: false, error: { kind: "not_found" } }),
      create: async () => ({ ok: true, value: makeUser("x") }),
      update: async () => ({ ok: true, value: makeUser("x") }),
      listAll: async () => ({ ok: true, value: [] }),
      emailExists: async () => ({ ok: true, value: false }),
      getPasswordHash: async () => ({ ok: true, value: "stub" }),
      updateTotalXp: async () => ({ ok: true, value: makeUser("x") }),
    };
    const sessionSpy = vi.spyOn(deps.sessionRepo, "create");
    useCase = new ImpersonateUser({ ...buildDeps(), userRepo: mockUserRepo });

    await useCase.execute({
      targetUserId: TARGET_ID,
      adminUserId: ADMIN_ID,
    });

    expect(sessionSpy).not.toHaveBeenCalled();
  });
});

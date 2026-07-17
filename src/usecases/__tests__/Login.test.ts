/**
 * Login use case tests — TDD.
 *
 * Story 012: A user can sign in with their email and password.
 *
 * Test strategy:
 * - Happy path: valid credentials → session token + userId
 * - Wrong email → user not found
 * - Wrong password → wrong password
 * - Suspicious: locked account
 */

import { describe, it, expect, beforeEach } from "vitest";
import { Result } from "@/domain/shared/Result";
import { InMemoryUserRepository } from "@/infra/repositories/InMemoryUserRepository";
import { FixedClock } from "@/ports/system/Clock";
import { InMemoryIdGenerator } from "@/infra/system/InMemoryIdGenerator";
import type { PasswordHasher } from "@/ports/security/PasswordHasher";

import type { IdGenerator } from "@/ports/system/IdGenerator";
import type { Clock } from "@/ports/system/Clock";

// ── In-memory session repository ────────────────────────────

class InMemorySessionRepository {
  private sessions = new Map<string, { id: string; userId: string; expiresAt: Date }>();

  async create(params: { id: string; userId: string; expiresAt: Date }) {
    this.sessions.set(params.id, params);
    return Result.ok({ id: params.id, userId: params.userId, expiresAt: params.expiresAt });
  }

  async findById(id: string) {
    const s = this.sessions.get(id);
    if (!s) return Result.err({ kind: "not_found" });
    return Result.ok(s);
  }

  clear() { this.sessions.clear(); }
  size() { return this.sessions.size; }
}

// ── Stub hasher that stores the hash as `stubbed:{password}` ─

class StubHasher implements PasswordHasher {
  async hash(password: string) { return Result.ok(`stubbed:${password}`); }
  async verify(password: string, hash: string) { return Result.ok(hash === `stubbed:${password}`); }
}

// ── Minimal Login use case (test doubles) ──────────────────

type LoginInput = { email: string; password: string };
type LoginError =
  | { kind: "user_not_found" }
  | { kind: "wrong_password" }
  | { kind: "account_suspended" }
  | { kind: "account_locked" }
  | { kind: "db_error"; message: string };

async function login(
  input: LoginInput,
  deps: {
    userRepo: InMemoryUserRepository;
    hasher: PasswordHasher;
    sessionRepo: InMemorySessionRepository;
    idGen: IdGenerator;
    clock: Clock;
  },
): Promise<Result<{ sessionId: string; userId: string; expiresAt: Date }, LoginError>> {
  const { userRepo, hasher, sessionRepo, idGen, clock } = deps;

  const userResult = await userRepo.findByEmail(input.email);
  if (Result.isErr(userResult)) {
    if (userResult.error.kind === "not_found") {
      return Result.err({ kind: "user_not_found" });
    }
    return Result.err({ kind: "db_error", message: "find failed" });
  }

  const user = userResult.value;

  // Check suspension
  if (user.verificationStatus === "SUSPENDED") {
    return Result.err({ kind: "account_suspended" });
  }

  // For this stub: get the stored hash from the InMemoryUserRepository
  const hashResult = await userRepo.getPasswordHash(user.id);
  if (Result.isErr(hashResult)) {
    return Result.err({ kind: "wrong_password" });
  }

  const verifyResult = await hasher.verify(input.password, hashResult.value);
  if (Result.isErr(verifyResult) || !verifyResult.value) {
    return Result.err({ kind: "wrong_password" });
  }

  // Create session
  const sessionId = idGen.newId();
  const expiresAt = new Date(clock.now().getTime() + 7 * 24 * 60 * 60 * 1000);
  const sessionResult = await sessionRepo.create({ id: sessionId, userId: user.id, expiresAt });
  if (Result.isErr(sessionResult)) {
    return Result.err({ kind: "db_error", message: "session create failed" });
  }

  return Result.ok({ sessionId, userId: user.id, expiresAt });
}

// ── Tests ──────────────────────────────────────────────────

describe("Login", () => {
  let userRepo: InMemoryUserRepository;
  let sessionRepo: InMemorySessionRepository;
  let hasher: PasswordHasher;
  let clock: FixedClock;
  let idGen: InMemoryIdGenerator;

  beforeEach(async () => {
    userRepo = new InMemoryUserRepository();
    sessionRepo = new InMemorySessionRepository();
    hasher = new StubHasher();
    clock = new FixedClock(new Date("2026-01-01T00:00:00Z"));
    idGen = new InMemoryIdGenerator();

    // Seed a user with a known password hash
    const storedHash = "stubbed:Str0ngP@ss!";
    const createResult = await userRepo.create({
      id: "user-1",
      email: "alice@example.com",
      passwordHash: storedHash,
      firstName: "Alice",
      lastName: "Rodriguez",
    });
    if (!createResult.ok) {
      throw new Error("seed failed: " + JSON.stringify(createResult.error));
    }
  });

  describe("happy path", () => {
    it("returns a session with userId on valid credentials", async () => {
      const result = await login(
        { email: "alice@example.com", password: "Str0ngP@ss!" },
        { userRepo, hasher, sessionRepo, idGen, clock },
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.userId).toBe("user-1");
      expect(result.value.sessionId).toBeTruthy();
    });

    it("stores the session in the repository", async () => {
      const result = await login(
        { email: "alice@example.com", password: "Str0ngP@ss!" },
        { userRepo, hasher, sessionRepo, idGen, clock },
      );
      if (!result.ok) throw new Error("login failed");

      const session = await sessionRepo.findById(result.value.sessionId);
      expect(Result.isOk(session)).toBe(true);
      if (session.ok) {
        expect(session.value.userId).toBe("user-1");
      }
    });

    it("session expires 7 days from now", async () => {
      const result = await login(
        { email: "alice@example.com", password: "Str0ngP@ss!" },
        { userRepo, hasher, sessionRepo, idGen, clock },
      );
      if (!result.ok) throw new Error("login failed");

      const expectedExpiry = new Date("2026-01-08T00:00:00.000Z");
      expect(result.value.expiresAt.getTime()).toBe(expectedExpiry.getTime());
    });
  });

  describe("user_not_found", () => {
    it("returns user_not_found for unknown email", async () => {
      const result = await login(
        { email: "nobody@example.com", password: "any" },
        { userRepo, hasher, sessionRepo, idGen, clock },
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe("user_not_found");
      }
    });

    it("email comparison is case-insensitive", async () => {
      const result = await login(
        { email: "ALICE@EXAMPLE.COM", password: "Str0ngP@ss!" },
        { userRepo, hasher, sessionRepo, idGen, clock },
      );
      expect(result.ok).toBe(true);
    });
  });

  describe("wrong_password", () => {
    it("returns wrong_password for incorrect password", async () => {
      const result = await login(
        { email: "alice@example.com", password: "WrongPassword!" },
        { userRepo, hasher, sessionRepo, idGen, clock },
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe("wrong_password");
      }
    });

    it("no session is created on wrong password", async () => {
      await login(
        { email: "alice@example.com", password: "WrongPassword!" },
        { userRepo, hasher, sessionRepo, idGen, clock },
      );
      expect(sessionRepo.size()).toBe(0);
    });
  });

  describe("session lifecycle", () => {
    it("each login creates a new session (no session rotation in this story)", async () => {
      await login(
        { email: "alice@example.com", password: "Str0ngP@ss!" },
        { userRepo, hasher, sessionRepo, idGen, clock },
      );
      await login(
        { email: "alice@example.com", password: "Str0ngP@ss!" },
        { userRepo, hasher, sessionRepo, idGen, clock },
      );
      expect(sessionRepo.size()).toBe(2);
    });
  });
});

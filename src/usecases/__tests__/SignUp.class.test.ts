/**
 * SignUp use case — class tests.
 * Uses the real SignUp class with InMemoryUserRepository.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { Result } from "@/domain/shared/Result";
import { SignUp } from "../SignUp";
import { InMemoryUserRepository } from "@/infra/repositories/InMemoryUserRepository";
import { FixedClock } from "@/ports/system/Clock";
import { InMemoryIdGenerator } from "@/infra/system/InMemoryIdGenerator";
import type { PasswordHasher } from "@/ports/security/PasswordHasher";
import { Result as R } from "@/domain/shared/Result";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { SilentLogger } from "@/infra/observability/SilentLogger";

/** Fast stub hasher for unit tests — no Argon2 overhead. */
class StubHasher implements PasswordHasher {
  async hash(password: string) {
    return R.ok(`stubbed:${password}`);
  }
  async verify(password: string, hash: string) {
    return R.ok(hash === `stubbed:${password}`);
  }
}

describe("SignUp (class)", () => {
  let userRepo: InMemoryUserRepository;
  let clock: FixedClock;
  let idGen: InMemoryIdGenerator;
  let recordAuditLog: RecordAuditLog;
  let signUp: SignUp;

  beforeEach(() => {
    userRepo = new InMemoryUserRepository();
    clock = new FixedClock(new Date("2026-01-01T00:00:00Z"));
    idGen = new InMemoryIdGenerator();
    recordAuditLog = new RecordAuditLog({
      auditLog: new InMemoryAuditLog(),
      idGen,
      clock,
      logger: new SilentLogger(),
    });
    signUp = new SignUp(userRepo, idGen, clock, new StubHasher(), recordAuditLog);
  });

  const validInput = {
    email: "alice@example.com",
    password: "Str0ngP@ss!",
    firstName: "Alice",
    lastName: "Rodriguez",
  };

  describe("execute()", () => {
    it("returns ok with userId and normalized email on success", async () => {
      const result = await signUp.execute(validInput);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.userId).toBeTruthy();
        expect(result.email).toBe("alice@example.com");
      }
    });

    it("persists the user in the repository", async () => {
      const result = await signUp.execute(validInput);
      if (!result.ok) throw new Error("signup failed");
      const userId = result.userId;
      const found = await userRepo.findById(userId);
      expect(Result.isOk(found) && found.value.email).toBe("alice@example.com");
    });

    it("returns email_taken for duplicate email (case-insensitive)", async () => {
      await signUp.execute(validInput);
      const result = await signUp.execute({ ...validInput, email: "ALICE@EXAMPLE.COM" });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe("email_taken");
      }
    });

    it("returns weak_password for short passwords", async () => {
      const result = await signUp.execute({ ...validInput, password: "abc" });
      expect(result.ok).toBe(false);
      if (!result.ok && result.error.kind === "weak_password") {
        expect(result.error.score).toBe(0);
      }
    });

    it("returns weak_password for passwords without uppercase", async () => {
      const result = await signUp.execute({ ...validInput, password: "password123" });
      expect(result.ok).toBe(false);
    });

    it("returns weak_password for passwords without uppercase or number", async () => {
      // Score: length>=8 (+1), len>=12 (+1), no uppercase (+0), no number (+0), no symbol (+0) = 2 < 3
      const result = await signUp.execute({ ...validInput, password: "onlylowercase" });
      expect(result.ok).toBe(false);
    });

    it("accepts password with 12+ chars, uppercase, number, symbol", async () => {
      const result = await signUp.execute({ ...validInput, password: "Str0ngP@ss!Xtra" });
      expect(result.ok).toBe(true);
    });

    it("returns invalid_name for empty firstName", async () => {
      const result = await signUp.execute({ ...validInput, firstName: "" });
      expect(result.ok).toBe(false);
      if (!result.ok && result.error.kind === "invalid_name") {
        expect(result.error.field).toBe("firstName");
      }
    });

    it("returns invalid_name for whitespace-only lastName", async () => {
      const result = await signUp.execute({ ...validInput, lastName: "   " });
      expect(result.ok).toBe(false);
      if (!result.ok && result.error.kind === "invalid_name") {
        expect(result.error.field).toBe("lastName");
      }
    });

    it("returns invalid_email for malformed email", async () => {
      const result = await signUp.execute({ ...validInput, email: "notvalid" });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe("invalid_email");
      }
    });

    // ── Proposal 4: strengthened email validation ──────────

    it("normalizes email casing and trims whitespace on success", async () => {
      const result = await signUp.execute({ ...validInput, email: "  Alice@Example.COM  " });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.email).toBe("alice@example.com");
    });

    it("rejects an empty/whitespace-only email", async () => {
      const result = await signUp.execute({ ...validInput, email: "   " });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("invalid_email");
    });

    it("rejects an email containing a space", async () => {
      const result = await signUp.execute({ ...validInput, email: "alice smith@example.com" });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("invalid_email");
    });

    it("rejects an email with a 1-character TLD", async () => {
      const result = await signUp.execute({ ...validInput, email: "alice@example.c" });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("invalid_email");
    });

    it("rejects an email over 254 characters total", async () => {
      const longDomain = "b".repeat(190) + ".com";
      const result = await signUp.execute({
        ...validInput,
        email: `${"a".repeat(64)}@${longDomain}`,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("invalid_email");
    });

    it("rejects an email with a local part over 64 characters", async () => {
      const result = await signUp.execute({
        ...validInput,
        email: `${"a".repeat(65)}@example.com`,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("invalid_email");
    });

    it("records a user.signed_up audit log entry on success (STORY-009)", async () => {
      const result = await signUp.execute(validInput);
      if (!result.ok) throw new Error("signup failed");

      const listResult = await recordAuditLog._auditLog.list({});
      expect(Result.isOk(listResult)).toBe(true);
      if (!Result.isOk(listResult)) return;

      const entry = listResult.value.entries.find((e) => e.actorId === result.userId);
      expect(entry).toBeDefined();
      expect(entry?.action).toBe("user.signed_up");
      expect(entry?.targetType).toBe("user");
      expect(entry?.targetId).toBe(result.userId);
      expect(entry?.metadata).toMatchObject({ email: "alice@example.com" });
    });

    it("does not record an audit entry when signup fails validation", async () => {
      await signUp.execute({ ...validInput, firstName: "" });
      const listResult = await recordAuditLog._auditLog.list({});
      expect(Result.isOk(listResult)).toBe(true);
      if (!Result.isOk(listResult)) return;
      expect(listResult.value.entries).toHaveLength(0);
    });

    it("stores the hashed password", async () => {
      const result = await signUp.execute(validInput);
      if (!result.ok) throw new Error("signup failed");
      const hash = userRepo.getPasswordHash(result.userId);
      expect(hash).toBeTruthy();
      // Hash is NOT the plaintext password
      expect(hash).not.toBe(validInput.password);
    });

    // ── additional error paths (STORY-010) ─────────────────

    it("returns email_taken when emailExists reports a duplicate", async () => {
      // Pre-seed the user repo to simulate someone else having
      // signed up with the same email. The use case checks
      // emailExists *before* create, so a pre-seeded user
      // surfaces this branch.
      await userRepo.create({
        id: "preexisting",
        email: "alice@example.com",
        passwordHash: "stubbed:PreExistingP@ss!",
        firstName: "P",
        lastName: "X",
      });

      const result = await signUp.execute(validInput);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toEqual({ kind: "email_taken" });
    });

    it("returns db_error when emailExists fails", async () => {
      const flakyRepo = new (class extends InMemoryUserRepository {
        override async emailExists() {
          return R.err({ kind: "db_error", message: "pg down" } as never);
        }
      })();
      const failingSignUp = new SignUp(flakyRepo, idGen, clock, new StubHasher(), recordAuditLog);
      const result = await failingSignUp.execute(validInput);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toEqual({ kind: "db_error", message: "email check failed" });
    });

    it("returns email_taken when create() fails on a race (passed emailExists but DB INSERT failed)", async () => {
      // Simulate the race: emailExists says "no", but a concurrent
      // transaction created the user first. The DB unique constraint
      // kicks in and create() returns email_taken.
      const racingRepo = new (class extends InMemoryUserRepository {
        override async emailExists() {
          return R.ok(false); // looks free
        }
        override async create() {
          return R.err({ kind: "email_taken" } as never); // but create fails
        }
      })();
      const racingSignUp = new SignUp(racingRepo, idGen, clock, new StubHasher(), recordAuditLog);
      const result = await racingSignUp.execute(validInput);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toEqual({ kind: "email_taken" });
    });

    it("returns db_error when create() fails on a non-email-taken error", async () => {
      const racingRepo = new (class extends InMemoryUserRepository {
        override async create() {
          return R.err({ kind: "db_error", message: "fk violation" } as never);
        }
      })();
      const failingSignUp = new SignUp(racingRepo, idGen, clock, new StubHasher(), recordAuditLog);
      const result = await failingSignUp.execute(validInput);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toEqual({ kind: "db_error", message: "create user failed" });
    });

    // ── Proposal 10: hashPassword() returns Result instead of throwing ──

    it("returns hash_error instead of throwing when the hasher fails", async () => {
      const failingHasher = new (class extends StubHasher {
        override async hash() {
          return R.err(new Error("argon2 out of memory") as never);
        }
      })();
      const failingSignUp = new SignUp(userRepo, idGen, clock, failingHasher, recordAuditLog);
      const result = await failingSignUp.execute(validInput);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toEqual({ kind: "hash_error", message: "Password hashing failed" });
    });

    it("creates no user when the hasher fails", async () => {
      const failingHasher = new (class extends StubHasher {
        override async hash() {
          return R.err(new Error("argon2 out of memory") as never);
        }
      })();
      const failingSignUp = new SignUp(userRepo, idGen, clock, failingHasher, recordAuditLog);
      await failingSignUp.execute(validInput);
      const existsResult = await userRepo.emailExists(validInput.email);
      expect(existsResult.ok && existsResult.value).toBe(false);
    });
  });
});

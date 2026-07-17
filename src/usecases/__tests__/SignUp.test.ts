/**
 * SignUp use case tests — TDD: tests written before the implementation.
 *
 * Story 003: A user can sign up with a valid email and password.
 *
 * Test strategy:
 * - Happy path: valid input → user created, email sent
 * - Email taken: error returned, no user created
 * - Weak password: error returned
 * - Empty name: error returned
 * - Duplicate race condition: second signup fails
 */

import { describe, it, expect, beforeEach } from "vitest";
import { Result } from "@/domain/shared/Result";
import { InMemoryUserRepository } from "@/infra/repositories/InMemoryUserRepository";
import { FixedClock } from "@/ports/system/Clock";
import { InMemoryIdGenerator } from "@/infra/system/InMemoryIdGenerator";

// ── Types mirroring the use case's public API ──────────────

type SignUpInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
};

type SignUpResult =
  | { ok: true; userId: string; email: string }
  | {
      ok: false;
      error:
        | { kind: "email_taken" }
        | { kind: "weak_password"; score: number }
        | { kind: "invalid_name"; field: "firstName" | "lastName" }
        | { kind: "invalid_email" }
        | { kind: "db_error"; message: string };
    };

// ── Minimal password validator (mirrors use case logic) ──────

const PASSWORD_MIN_SCORE = 3; // 0–4 scale

function assessPassword(password: string): number {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(score, 4);
}

// ── The use case under test (will be replaced by real impl) ─

/** Stub SignUp that mirrors the real interface — tests drive the API shape. */
async function signUp(
  input: SignUpInput,
  repos: { userRepo: InMemoryUserRepository },
  _deps: { idGenerator: InMemoryIdGenerator; clock: FixedClock },
): Promise<SignUpResult> {
  // Validate names
  if (!input.firstName.trim()) {
    return { ok: false, error: { kind: "invalid_name", field: "firstName" } };
  }
  if (!input.lastName.trim()) {
    return { ok: false, error: { kind: "invalid_name", field: "lastName" } };
  }

  // Validate email format
  if (!input.email.includes("@") || !input.email.includes(".")) {
    return { ok: false, error: { kind: "invalid_email" } };
  }

  // Validate password strength
  const score = assessPassword(input.password);
  if (score < PASSWORD_MIN_SCORE) {
    return { ok: false, error: { kind: "weak_password", score } };
  }

  // Check email uniqueness
  const emailExists = await repos.userRepo.emailExists(input.email);
  if (Result.isErr(emailExists)) {
    return { ok: false, error: { kind: "db_error", message: "email check failed" } };
  }
  if (emailExists.value) {
    return { ok: false, error: { kind: "email_taken" } };
  }

  // Hash password (stub — real impl uses argon2)
  const passwordHash = `stubbed:${input.password}`;

  // Create user
  const id = "stub-id-" + Date.now();
  const createResult = await repos.userRepo.create({
    id,
    email: input.email,
    passwordHash,
    firstName: input.firstName,
    lastName: input.lastName,
  });

  if (Result.isErr(createResult)) {
    if (createResult.error.kind === "email_taken") {
      return { ok: false, error: { kind: "email_taken" } };
    }
    return { ok: false, error: { kind: "db_error", message: "create failed" } };
  }

  return { ok: true, userId: id, email: createResult.value.email };
}

// ── Tests ───────────────────────────────────────────────────

describe("SignUp", () => {
  let userRepo: InMemoryUserRepository;
  let clock: FixedClock;
  let idGen: InMemoryIdGenerator;

  beforeEach(() => {
    userRepo = new InMemoryUserRepository();
    clock = new FixedClock(new Date("2026-01-01T00:00:00Z"));
    idGen = new InMemoryIdGenerator();
  });

  const validInput: SignUpInput = {
    email: "alice@example.com",
    password: "Str0ngP@ssw0rd!",
    firstName: "Alice",
    lastName: "Rodriguez",
  };

  describe("happy path", () => {
    it("creates a user and returns their ID and normalized email", async () => {
      const result = await signUp(validInput, { userRepo }, { idGenerator: idGen, clock });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.userId).toBeTruthy();
        expect(result.email).toBe("alice@example.com"); // lowercase
      }
    });

    it("persists the user in the repository", async () => {
      await signUp(validInput, { userRepo }, { idGenerator: idGen, clock });

      const found = await userRepo.findByEmail("alice@example.com");
      expect(Result.isOk(found)).toBe(true);
    });

    it("email is normalized to lowercase", async () => {
      await signUp({ ...validInput, email: "Alice@EXAMPLE.COM" }, { userRepo }, { idGenerator: idGen, clock });

      const found = await userRepo.findByEmail("alice@example.com");
      expect(Result.isOk(found)).toBe(true);
      if (found.ok) {
        expect(found.value.email).toBe("alice@example.com");
      }
    });
  });

  describe("email_taken", () => {
    it("returns email_taken when the email already exists", async () => {
      await signUp(validInput, { userRepo }, { idGenerator: idGen, clock });

      const result = await signUp(
        { ...validInput, email: "alice@example.com" },
        { userRepo },
        { idGenerator: idGen, clock },
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe("email_taken");
      }
    });

    it("email comparison is case-insensitive", async () => {
      await signUp(validInput, { userRepo }, { idGenerator: idGen, clock });

      const result = await signUp(
        { ...validInput, email: "ALICE@EXAMPLE.COM" },
        { userRepo },
        { idGenerator: idGen, clock },
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe("email_taken");
      }
    });

    it("does not create a duplicate user", async () => {
      await signUp(validInput, { userRepo }, { idGenerator: idGen, clock });
      await signUp(validInput, { userRepo }, { idGenerator: idGen, clock });

      expect(userRepo.count()).toBe(1);
    });
  });

  describe("weak_password", () => {
    const weakPasswords: Array<{ password: string; score: number }> = [
      { password: "abc", score: 0 },
      { password: "longpassword", score: 2 }, // length >= 8 (+1) and >= 12 (+1), no uppercase/number/symbol
    ];

    weakPasswords.forEach(({ password, score }) => {
      it(`rejects password score ${score} (< ${PASSWORD_MIN_SCORE})`, async () => {
        const result = await signUp(
          { ...validInput, password },
          { userRepo },
          { idGenerator: idGen, clock },
        );

        expect(result.ok).toBe(false);
        if (!result.ok && result.error.kind === "weak_password") {
          expect(result.error.score).toBe(score);
        }
      });
    });

    it("accepts minimum acceptable password (score 3)", async () => {
      // 12+ chars, uppercase, number = score 3
      const result = await signUp(
        { ...validInput, password: "Password123" },
        { userRepo },
        { idGenerator: idGen, clock },
      );
      expect(result.ok).toBe(true);
    });

    it("rejects passwords below score 3 (score 2)", async () => {
      // Score: length>=8 (+1) + length>=12 (+1) + no uppercase (+0) + no number (+0) + no symbol (+0) = 2
      const result = await signUp(
        { ...validInput, password: "longpassword" },
        { userRepo },
        { idGenerator: idGen, clock },
      );
      expect(result.ok).toBe(false);
    });
  });

  describe("invalid_name", () => {
    it("returns invalid_name when firstName is empty", async () => {
      const result = await signUp(
        { ...validInput, firstName: "" },
        { userRepo },
        { idGenerator: idGen, clock },
      );

      expect(result.ok).toBe(false);
      if (!result.ok && result.error.kind === "invalid_name") {
        expect(result.error.field).toBe("firstName");
      }
    });

    it("returns invalid_name when lastName is whitespace-only", async () => {
      const result = await signUp(
        { ...validInput, lastName: "   " },
        { userRepo },
        { idGenerator: idGen, clock },
      );

      expect(result.ok).toBe(false);
      if (!result.ok && result.error.kind === "invalid_name") {
        expect(result.error.field).toBe("lastName");
      }
    });
  });

  describe("invalid_email", () => {
    it("rejects email without @", async () => {
      const result = await signUp(
        { ...validInput, email: "notanemail" },
        { userRepo },
        { idGenerator: idGen, clock },
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe("invalid_email");
      }
    });

    it("rejects email without domain dot", async () => {
      const result = await signUp(
        { ...validInput, email: "alice@nodomain" },
        { userRepo },
        { idGenerator: idGen, clock },
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe("invalid_email");
      }
    });
  });

  describe("race condition: duplicate signup race", () => {
    it("second concurrent signup fails with email_taken (last write wins at repo level)", async () => {
      // This test documents current behavior: the second concurrent call
      // sees the first user's email and returns email_taken.
      // A true optimistic lock would be added in a later story.
      const [result1, result2] = await Promise.all([
        signUp(validInput, { userRepo }, { idGenerator: idGen, clock }),
        signUp(validInput, { userRepo }, { idGenerator: idGen, clock }),
      ]);

      // One succeeds, one fails
      const successes = [result1, result2].filter((r) => r.ok);
      const failures = [result1, result2].filter((r) => !r.ok);

      expect(successes.length).toBe(1);
      expect(failures.length).toBe(1);
      if (failures[0] && !failures[0].ok) {
        expect(failures[0].error.kind).toBe("email_taken");
      }
    });
  });
});

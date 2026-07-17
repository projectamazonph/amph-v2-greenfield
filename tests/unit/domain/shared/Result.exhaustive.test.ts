import { describe, it, expect } from "vitest";
import { Result } from "@/domain/shared/Result";

/**
 * Exhaustive discriminated union tests.
 *
 * ADR-014: Result<T, E> is the canonical cross-layer boundary type.
 * Every port method returns Result. These tests prove the discriminated
 * union works correctly for real-world error shapes.
 */

type PaymentError =
  | { kind: "card_declined"; code: string }
  | { kind: "insufficient_balance" }
  | { kind: "network_error" }
  | { kind: "expired_card" };

type UserError =
  | { kind: "email_taken" }
  | { kind: "invalid_email" }
  | { kind: "weak_password"; score: number }
  | { kind: "rate_limited"; retryAfter: number };

describe("PaymentError discriminated union", () => {
  function processCard(amount: number, code?: string): Result<{ ref: string }, PaymentError> {
    if (amount <= 0) return Result.err({ kind: "insufficient_balance" });
    if (code === "expired") return Result.err({ kind: "expired_card" });
    if (code === "declined") return Result.err({ kind: "card_declined", code: "05" });
    return Result.ok({ ref: "AMPH-abc123" });
  }

  it("returns ok for valid payment", () => {
    const r = processCard(1000);
    expect(Result.isOk(r)).toBe(true);
  });

  it("handles card_declined with code", () => {
    const r = processCard(1000, "declined");
    expect(Result.isErr(r)).toBe(true);
    if (!r.ok && r.error.kind === "card_declined") {
      expect(r.error.code).toBe("05");
    }
  });

  it("handles insufficient_balance", () => {
    const r = processCard(-1);
    if (!r.ok) {
      expect(r.error.kind).toBe("insufficient_balance");
    }
  });

  it("switch is exhaustive — TypeScript would error if a case is missing", () => {
    const r = processCard(500, "declined");
    if (!r.ok) {
      const err = r.error;
      switch (err.kind) {
        case "card_declined":
          return;
        case "insufficient_balance":
          return;
        case "network_error":
          return;
        case "expired_card":
          return;
        default: {
          const _exhaustive: never = err;
          return _exhaustive;
        }
      }
    }
  });
});

describe("UserError discriminated union", () => {
  function validateUser(
    email: string,
    password: string,
  ): Result<{ email: string }, UserError> {
    if (!email.includes("@")) return Result.err({ kind: "invalid_email" });
    if (email === "taken@example.com") return Result.err({ kind: "email_taken" });
    if (password.length < 8) return Result.err({ kind: "weak_password", score: 1 });
    return Result.ok({ email });
  }

  it("returns ok for valid user", () => {
    const r = validateUser("alice@example.com", "longpassword123");
    expect(Result.isOk(r)).toBe(true);
  });

  it("handles weak_password with score", () => {
    const r = validateUser("alice@example.com", "abc");
    if (!r.ok && r.error.kind === "weak_password") {
      expect(r.error.score).toBe(1);
    }
  });

  it("exhaustive switch for UserError", () => {
    const r = validateUser("taken@example.com", "password123");
    if (!r.ok) {
      const err = r.error;
      switch (err.kind) {
        case "email_taken":
        case "invalid_email":
        case "weak_password":
        case "rate_limited":
          break;
        default: {
          const _never: never = err;
          return _never;
        }
      }
    }
  });
});

describe("Result chaining (flatMap)", () => {
  it("chains a full user signup simulation", async () => {
    function validateEmail(email: string): Result<string, UserError> {
      return email.includes("@")
        ? Result.ok(email)
        : Result.err({ kind: "invalid_email" });
    }

    function hashPassword(pw: string): Result<string, never> {
      return Result.ok(`hashed:${pw}`);
    }

    const email = "alice@example.com";
    const r1 = validateEmail(email);
    const r2 = Result.flatMap(r1, hashPassword);

    expect(Result.isOk(r2)).toBe(true);
    if (r2.ok) {
      expect(r2.value).toBe("hashed:alice@example.com");
    }
  });
});

/**
 * ResendVerification use case — STORY-007.
 *
 * RED phase: pin the contract before implementation.
 *
 * The use case:
 * 1. Resolves the user by userId.
 * 2. Returns already_verified if emailVerifiedAt is set.
 * 3. Rate-limits: 1 request per 60s per user.
 * 4. Generates a new token, stores it via EmailVerificationRepository.
 * 5. Sends the verification email via EmailSender.
 * 6. Returns { sent: true, retryAfter: <60s in the future> }.
 *
 * Errors:
 *   - user_not_found
 *   - already_verified
 *   - rate_limited (with retryAfter: Date)
 *
 * Three tests pin the contract:
 *   1. happy: unverified user, not rate-limited → token created + email sent
 *   2. already_verified: user.emailVerifiedAt is set → already_verified
 *   3. rate_limited: same user re-requests within 60s → rate_limited + retryAfter
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createHash, randomBytes } from "node:crypto";
import { Result } from "@/domain/shared/Result";
import { ResendVerification } from "@/usecases/auth/ResendVerification";
import { InMemoryUserRepository } from "@/infra/repositories/InMemoryUserRepository";
import { InMemoryEmailVerificationRepository } from "@/infra/db/inmemory/InMemoryEmailVerificationRepository";
import { FixedClock } from "@/ports/system/Clock";
import type { Logger } from "@/ports/observability/Logger";
import type { EmailSender } from "@/ports/email/EmailSender";
import type { RateLimiter, RateLimitResult } from "@/ports/security/RateLimiter";
import type { IdGenerator } from "@/ports/system/IdGenerator";

class SilentLogger implements Logger {
  debug() {}
  info() {}
  warn() {}
  error() {}
  child() {
    return this;
  }
}

class FixedIdGenerator implements IdGenerator {
  constructor(private readonly value: string) {}
  newId(): string {
    return this.value;
  }
  paymentRef(): string {
    return `AMPH-${this.value}`;
  }
  receiptNumber(): string {
    return `AMPH-2026-${this.value}`;
  }
}

class StubEmailSender implements EmailSender {
  public sent: Array<{ to: string; subject: string; react: unknown }> = [];
  async send(args: Parameters<EmailSender["send"]>[0]) {
    this.sent.push({ to: args.to, subject: args.subject, react: args.react });
    return Result.ok({ messageId: "email-1" } as never);
  }
}

class StubRateLimiter implements RateLimiter {
  public calls: Array<{ key: string; limit: number; windowSeconds: number }> = [];
  constructor(private readonly allowed: boolean) {}
  async check(input: {
    key: string;
    limit: number;
    windowSeconds: number;
  }): Promise<Result<RateLimitResult, never>> {
    this.calls.push(input);
    return Result.ok({
      allowed: this.allowed,
      remaining: this.allowed ? 0 : 0,
      resetSeconds: 60,
    });
  }
}

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

describe("ResendVerification", () => {
  let users: InMemoryUserRepository;
  let emailVerifications: InMemoryEmailVerificationRepository;
  let clock: FixedClock;
  let logger: Logger;
  let emailSender: StubEmailSender;
  let idGen: FixedIdGenerator;
  let useCase: ResendVerification;

  const T0 = new Date("2026-01-01T00:00:00Z");

  beforeEach(async () => {
    users = new InMemoryUserRepository();
    emailVerifications = new InMemoryEmailVerificationRepository();
    clock = new FixedClock(T0);
    logger = new SilentLogger();
    emailSender = new StubEmailSender();
    // Use a fixed raw token so the test can compute its hash.
    idGen = new FixedIdGenerator("raw-token-fixed-for-tests");
  });

  function makeUseCase(rateLimiter: RateLimiter) {
    return new ResendVerification({
      users,
      emailVerifications,
      clock,
      logger,
      emailSender,
      rateLimiter,
      idGen,
    });
  }

  async function seedUnverifiedUser() {
    const created = await users.create({
      id: "user-1",
      email: "alice@example.com",
      passwordHash: "stub",
      firstName: "Alice",
      lastName: "R",
    });
    if (!created.ok) throw new Error("seed failed");
    return created.value;
  }

  // ── happy path ──────────────────────────────────────────────

  it("creates a token and sends a verification email for an unverified user", async () => {
    await seedUnverifiedUser();
    const rateLimiter = new StubRateLimiter(true);
    const useCase = makeUseCase(rateLimiter);

    const result = await useCase.execute({ userId: "user-1" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.sent).toBe(true);
    expect(result.value.retryAfter).toBeInstanceOf(Date);
    // retryAfter is roughly now + 60s
    const diff = result.value.retryAfter.getTime() - T0.getTime();
    expect(diff).toBeGreaterThanOrEqual(60_000);
    expect(diff).toBeLessThanOrEqual(61_000);

    // Email was sent to the right user
    expect(emailSender.sent).toHaveLength(1);
    expect(emailSender.sent[0]!.to).toBe("alice@example.com");

    // A token record was persisted (hashed)
    expect(rateLimiter.calls).toHaveLength(1);
    expect(rateLimiter.calls[0]!.key).toBe("user-1");
  });

  // ── error paths ─────────────────────────────────────────────

  it("returns already_verified when the user has emailVerifiedAt set", async () => {
    const user = await seedUnverifiedUser();
    // Mark the user as verified by going through the repo.
    await users.update(user.id, { emailVerifiedAt: T0 });

    const rateLimiter = new StubRateLimiter(true);
    const useCase = makeUseCase(rateLimiter);

    const result = await useCase.execute({ userId: "user-1" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("already_verified");
    // No email sent
    expect(emailSender.sent).toHaveLength(0);
  });

  it("returns rate_limited when the rate limiter says no, with retryAfter", async () => {
    await seedUnverifiedUser();
    const rateLimiter = new StubRateLimiter(false);
    const useCase = makeUseCase(rateLimiter);

    const result = await useCase.execute({ userId: "user-1" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    if (result.error.kind !== "rate_limited") throw new Error("expected rate_limited");
    expect(result.error.retryAfter).toBeInstanceOf(Date);
    // No email sent
    expect(emailSender.sent).toHaveLength(0);
  });
});

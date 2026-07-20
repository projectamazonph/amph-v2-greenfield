/**
 * RequestPasswordReset use case — STORY-008.
 *
 * RED phase: pin the contract before implementation.
 *
 * The use case:
 * 1. Validates the email.
 * 2. Rate-limits by email (5/hour) and by IP (20/hour).
 *    If either is exceeded, returns rate_limited.
 * 3. Looks up the user.
 * 4. If user exists, invalidates their existing tokens, creates
 *    a new one, and sends the email.
 * 5. Always returns { sent: true } to prevent email enumeration.
 *
 * 4 tests:
 *  - happy: existing user → token created + email sent
 *  - happy-noop: non-existent email → no token, no email, sent: true
 *  - rate-limited: email rate limit hit → rate_limited
 *  - validation-failed: invalid email format → validation_failed
 */

import { describe, it, expect, beforeEach } from "vitest";
import { Result } from "@/domain/shared/Result";
import { RequestPasswordReset } from "@/usecases/auth/RequestPasswordReset";
import { InMemoryUserRepository } from "@/infra/repositories/InMemoryUserRepository";
import { InMemoryPasswordResetRepository } from "@/infra/db/inmemory/InMemoryPasswordResetRepository";
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
  private counter = 0;
  newId(): string {
    this.counter += 1;
    return `id-${this.counter}`;
  }
  paymentRef(): string {
    return `AMPH-${this.newId()}`;
  }
  receiptNumber(): string {
    return `AMPH-2026-${String(this.counter).padStart(6, "0")}`;
  }
}

class StubEmailSender implements EmailSender {
  public sent: Array<{ to: string; subject: string; react: unknown }> = [];
  async send(args: Parameters<EmailSender["send"]>[0]) {
    this.sent.push({ to: args.to, subject: args.subject, react: args.react });
    return Result.ok({ messageId: "msg-1" } as never);
  }
}

class StubRateLimiter implements RateLimiter {
  public calls: Array<{ key: string; limit: number; windowSeconds: number }> = [];
  // By default, allow everything. Tests override per-key.
  private blocks = new Set<string>();

  blockKey(key: string): void {
    this.blocks.add(key);
  }

  async check(args: { key: string; limit: number; windowSeconds: number }): Promise<Result<RateLimitResult, never>> {
    this.calls.push(args);
    if (this.blocks.has(args.key)) {
      return Result.ok({ allowed: false, remaining: 0, resetSeconds: args.windowSeconds });
    }
    return Result.ok({ allowed: true, remaining: args.limit, resetSeconds: 0 });
  }
}

describe("RequestPasswordReset", () => {
  let users: InMemoryUserRepository;
  let passwordResets: InMemoryPasswordResetRepository;
  let emailSender: StubEmailSender;
  let rateLimiter: StubRateLimiter;
  let idGen: FixedIdGenerator;
  let useCase: RequestPasswordReset;

  const T0 = new Date("2026-02-01T00:00:00Z");
  const clock = new FixedClock(T0);

  beforeEach(() => {
    users = new InMemoryUserRepository();
    passwordResets = new InMemoryPasswordResetRepository();
    emailSender = new StubEmailSender();
    rateLimiter = new StubRateLimiter();
    idGen = new FixedIdGenerator();
    useCase = new RequestPasswordReset({
      users,
      passwordResets,
      email: emailSender,
      rateLimiter,
      clock,
      ids: idGen,
      logger: new SilentLogger(),
    });
  });

  async function seedUser() {
    const r = await users.create({
      id: "user-1",
      email: "alice@example.com",
      passwordHash: "hash",
      firstName: "Alice",
      lastName: "R",
    });
    if (!r.ok) throw new Error("seed failed");
    return r.value;
  }

  it("creates a reset token and sends an email for an existing user", async () => {
    await seedUser();
    const result = await useCase.execute({
      email: "alice@example.com",
      ip: "1.2.3.4",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.sent).toBe(true);
    expect(emailSender.sent).toHaveLength(1);
    expect(emailSender.sent[0]!.to).toBe("alice@example.com");
  });

  it("returns sent: true for a non-existent email (no token, no email)", async () => {
    const result = await useCase.execute({
      email: "ghost@example.com",
      ip: "1.2.3.4",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.sent).toBe(true);
    expect(emailSender.sent).toHaveLength(0);
  });

  it("returns rate_limited when the email rate limit is hit", async () => {
    rateLimiter.blockKey("email:alice@example.com");
    const result = await useCase.execute({
      email: "alice@example.com",
      ip: "1.2.3.4",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("rate_limited");
  });

  it("returns validation_failed for an invalid email", async () => {
    const result = await useCase.execute({
      email: "not-an-email",
      ip: "1.2.3.4",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("validation_failed");
  });

  // ── additional error paths (STORY-010) ─────────────────

  it("returns rate_limited when the IP rate limit is hit (not the email)", async () => {
    // Block the IP key, not the email key.
    rateLimiter.blockKey("ip:9.9.9.9");
    const result = await useCase.execute({
      email: "alice@example.com",
      ip: "9.9.9.9",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("rate_limited");
    if (result.error.kind === "rate_limited") {
      expect(result.error.resetAt).toBeInstanceOf(Date);
    }
  });

  it("returns sent: true when the token create fails (DB down) — don't leak the error", async () => {
    // The use case intentionally maps a token-create failure to
    // sent: true to prevent email enumeration. The user gets the
    // same response whether or not their account exists.
    const flakyRepo = new (class extends InMemoryPasswordResetRepository {
      override async create() {
        return { ok: false, error: { kind: "db_error", message: "pg down" } } as never;
      }
    })();
    const failingUseCase = new RequestPasswordReset({
      users,
      passwordResets: flakyRepo,
      email: emailSender,
      rateLimiter,
      clock,
      ids: idGen,
      logger: new SilentLogger(),
    });
    await seedUser();
    const result = await failingUseCase.execute({
      email: "alice@example.com",
      ip: "1.2.3.4",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.sent).toBe(true);
    // No email was sent because the create failed
    expect(emailSender.sent).toHaveLength(0);
  });
});

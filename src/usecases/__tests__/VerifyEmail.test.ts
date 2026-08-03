/**
 * VerifyEmail use case — STORY-007.
 *
 * RED phase: the test pins the contract. The use case (and the
 * EmailVerificationRepository it depends on) does not exist yet,
 * so this file should fail to import / typecheck / run.
 *
 * Contract pinned by these 4 tests:
 *   1. happy: valid, unused, non-expired token → ok + user returned
 *   2. invalid_token: token not in DB → invalid_token error
 *   3. token_expired: token exists, unused, but past its expiry → token_expired error
 *   4. token_already_used: token exists but record.usedAt is set → token_already_used error
 *
 * Security: tokens are SHA-256 hashed before being looked up. The
 * raw token from the URL never reaches the repository.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createHash } from "node:crypto";
import { Result } from "@/domain/shared/Result";
import { VerifyEmail } from "@/usecases/auth/VerifyEmail";
import { InMemoryUserRepository } from "@/infra/repositories/InMemoryUserRepository";
import { InMemoryEmailVerificationRepository } from "@/infra/db/inmemory/InMemoryEmailVerificationRepository";
import { FixedClock } from "@/ports/system/Clock";
import type { Logger } from "@/ports/observability/Logger";
import type { EmailSender } from "@/ports/email/EmailSender";
import type { WelcomeRenderer } from "@/ports/email/WelcomeRenderer";
import { InMemoryEmailTemplateRepository } from "@/infra/repositories/InMemoryEmailTemplateRepository";

class SilentLogger implements Logger {
  debug() {}
  info() {}
  warn() {}
  error() {}
  child() {
    return this;
  }
}

class StubEmailSender implements EmailSender {
  public sent: Array<{ to: string; subject: string }> = [];
  async send(args: Parameters<EmailSender["send"]>[0]) {
    this.sent.push({ to: args.to, subject: args.subject });
    return Result.ok({ messageId: "msg-1" } as never);
  }
}

class StubWelcomeRenderer implements WelcomeRenderer {
  public calls: Array<{ firstName: string; dashboardUrl: string }> = [];
  render(args: { firstName: string; dashboardUrl: string }) {
    this.calls.push(args);
    return { __stub_welcome_email__: args } as unknown as React.ReactElement;
  }
}

/** Helper: SHA-256 the way the use case will. */
function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

describe("VerifyEmail", () => {
  let users: InMemoryUserRepository;
  let emailVerifications: InMemoryEmailVerificationRepository;
  let clock: FixedClock;
  let logger: Logger;
  let emailSender: StubEmailSender;
  let welcomeEmailRenderer: StubWelcomeRenderer;
  let useCase: VerifyEmail;

  // Anchor time for the test suite. T0 = Jan 1 2026 00:00:00 UTC.
  const T0 = new Date("2026-01-01T00:00:00Z");

  beforeEach(async () => {
    users = new InMemoryUserRepository();
    emailVerifications = new InMemoryEmailVerificationRepository();
    clock = new FixedClock(T0);
    logger = new SilentLogger();
    emailSender = new StubEmailSender();
    welcomeEmailRenderer = new StubWelcomeRenderer();
    useCase = new VerifyEmail({
      emailVerifications,
      users,
      clock,
      logger,
      emailSender,
      welcomeEmailRenderer,
      emailTemplateRepo: new InMemoryEmailTemplateRepository(),
    });

    // Seed a user
    const created = await users.create({
      id: "user-1",
      email: "alice@example.com",
      passwordHash: "stub-hash",
      firstName: "Alice",
      lastName: "Rodriguez",
    });
    if (!created.ok) throw new Error("seed failed");
  });

  // ── happy path ──────────────────────────────────────────────

  it("returns the user when given a valid, unused, non-expired token", async () => {
    const token = "raw-token-from-email-link";
    await emailVerifications.create({
      userId: "user-1",
      tokenHash: sha256(token),
      expiresAt: new Date(T0.getTime() + 24 * 60 * 60 * 1000), // 24h from T0
    });

    const result = await useCase.execute({ token });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.user.id).toBe("user-1");

    // Welcome email fires once verification succeeds.
    expect(emailSender.sent).toHaveLength(1);
    expect(emailSender.sent[0]?.to).toBe("alice@example.com");
    expect(welcomeEmailRenderer.calls).toHaveLength(1);
    expect(welcomeEmailRenderer.calls[0]?.firstName).toBe("Alice");
  });

  it("marks the token as used so it can't be replayed", async () => {
    const token = "raw-token-from-email-link";
    await emailVerifications.create({
      userId: "user-1",
      tokenHash: sha256(token),
      expiresAt: new Date(T0.getTime() + 24 * 60 * 60 * 1000),
    });

    await useCase.execute({ token });

    // Second use of the same token must fail with token_already_used.
    const replay = await useCase.execute({ token });
    expect(replay.ok).toBe(false);
    if (replay.ok) return;
    expect(replay.error.kind).toBe("token_already_used");
  });

  // ── error paths ─────────────────────────────────────────────

  it("returns invalid_token when no record matches the hashed token", async () => {
    const result = await useCase.execute({ token: "never-issued-token" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("invalid_token");
  });

  it("returns token_expired when the record's expiresAt is in the past", async () => {
    // Advance the clock past the token's expiry.
    clock.set(new Date(T0.getTime() + 48 * 60 * 60 * 1000)); // +48h
    const token = "expired-token";
    await emailVerifications.create({
      userId: "user-1",
      tokenHash: sha256(token),
      expiresAt: new Date(T0.getTime() + 24 * 60 * 60 * 1000), // expired 24h ago
    });

    const result = await useCase.execute({ token });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("token_expired");
  });

  it("returns token_already_used when the record's usedAt is set", async () => {
    const token = "previously-used-token";
    const created = await emailVerifications.create({
      userId: "user-1",
      tokenHash: sha256(token),
      expiresAt: new Date(T0.getTime() + 24 * 60 * 60 * 1000),
    });
    if (!created.ok) throw new Error("seed failed");
    // Simulate that this token was used in a prior call.
    const used = await emailVerifications.markUsed(created.value.id);
    if (!used.ok) throw new Error("seed markUsed failed");

    const result = await useCase.execute({ token });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("token_already_used");
  });

  it("hashes the token with SHA-256 before looking it up", async () => {
    // The use case must NEVER pass the raw token to the repository.
    // It must hash first. We assert this by spying on findByTokenHash.
    const token = "spy-token";
    await emailVerifications.create({
      userId: "user-1",
      tokenHash: sha256(token),
      expiresAt: new Date(T0.getTime() + 24 * 60 * 60 * 1000),
    });

    const seen: string[] = [];
    const spy = {
      async create(args: Parameters<typeof emailVerifications.create>[0]) {
        return emailVerifications.create(args);
      },
      async findByTokenHash(tokenHash: string) {
        seen.push(tokenHash);
        return emailVerifications.findByTokenHash(tokenHash);
      },
      async markUsed(id: string) {
        return emailVerifications.markUsed(id);
      },
    };

    const useCaseWithSpy = new VerifyEmail({
      emailVerifications: spy,
      users,
      clock,
      logger,
      emailSender,
      welcomeEmailRenderer,
      emailTemplateRepo: new InMemoryEmailTemplateRepository(),
    });
    const result = await useCaseWithSpy.execute({ token });

    expect(result.ok).toBe(true);
    expect(seen).toEqual([sha256(token)]);
    expect(seen[0]).not.toBe(token); // sanity: the raw token was NOT used
  });

  // ── additional error paths (STORY-010) ─────────────────

  it("returns invalid_token when markUsed fails (defensive, e.g. DB down)", async () => {
    const token = "tok-markfail";
    await emailVerifications.create({
      userId: "user-1",
      tokenHash: sha256(token),
      expiresAt: new Date(T0.getTime() + 24 * 60 * 60 * 1000),
    });
    // Spy that succeeds findByTokenHash but fails markUsed.
    const spy = {
      async create(args: Parameters<typeof emailVerifications.create>[0]) {
        return emailVerifications.create(args);
      },
      async findByTokenHash(tokenHash: string) {
        return emailVerifications.findByTokenHash(tokenHash);
      },
      async markUsed() {
        return { ok: false, error: { kind: "db_error", message: "pg down" } } as const;
      },
    };
    const useCaseWithSpy = new VerifyEmail({
      emailVerifications: spy,
      users,
      clock,
      logger,
      emailSender,
      welcomeEmailRenderer,
      emailTemplateRepo: new InMemoryEmailTemplateRepository(),
    });
    const result = await useCaseWithSpy.execute({ token });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("invalid_token");
  });

  it("returns invalid_token when userRepo.update fails after marking the token used", async () => {
    const token = "tok-userupdate-fail";
    await emailVerifications.create({
      userId: "user-1",
      tokenHash: sha256(token),
      expiresAt: new Date(T0.getTime() + 24 * 60 * 60 * 1000),
    });
    const flakyUsers = new (class extends InMemoryUserRepository {
      override async update() {
        return { ok: false, error: { kind: "db_error", message: "pg down" } } as never;
      }
    })();
    const useCaseWithFlaky = new VerifyEmail({
      emailVerifications,
      users: flakyUsers,
      clock,
      logger,
      emailSender,
      welcomeEmailRenderer,
      emailTemplateRepo: new InMemoryEmailTemplateRepository(),
    });
    const result = await useCaseWithFlaky.execute({ token });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("invalid_token");
    // The token is still burned (markUsed succeeded) so the user can't
    // replay it; they must request a new verification email.
    const replay = await useCase.execute({ token });
    expect(replay.ok).toBe(false);
    if (replay.ok) return;
    expect(replay.error.kind).toBe("token_already_used");
  });
});

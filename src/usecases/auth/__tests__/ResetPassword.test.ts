/**
 * ResetPassword use case — STORY-008.
 *
 * RED phase: pin the contract before implementation.
 *
 * 5 tests:
 *  - happy: valid token + new password → user updated, token used
 *  - invalid-token: no record for the hashed token
 *  - token-expired: token past expiresAt
 *  - token-already-used: token's usedAt is set
 *  - weak-password: new password fails strength check
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createHash } from "node:crypto";
import { Result } from "@/domain/shared/Result";
import { ResetPassword } from "@/usecases/auth/ResetPassword";
import { InMemoryUserRepository } from "@/infra/repositories/InMemoryUserRepository";
import { InMemoryPasswordResetRepository } from "@/infra/db/inmemory/InMemoryPasswordResetRepository";
import { InMemorySessionRepository } from "@/infra/repositories/InMemorySessionRepository";
import { FixedClock } from "@/ports/system/Clock";
import type { Logger } from "@/ports/observability/Logger";
import type { EmailSender } from "@/ports/email/EmailSender";
import type { PasswordHasher } from "@/ports/security/PasswordHasher";
import type { Clock } from "@/ports/system/Clock";

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

class StubPasswordHasher implements PasswordHasher {
  async hash(_password: string): Promise<Result<string, never>> {
    return Result.ok("hashed");
  }
  async verify(_password: string, _hash: string): Promise<Result<boolean, never>> {
    return Result.ok(true);
  }
}

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

describe("ResetPassword", () => {
  let users: InMemoryUserRepository;
  let passwordResets: InMemoryPasswordResetRepository;
  let emailSender: StubEmailSender;
  let hasher: StubPasswordHasher;
  let useCase: ResetPassword;

  const T0 = new Date("2026-02-01T00:00:00Z");
  const clock = new FixedClock(T0);

  beforeEach(() => {
    users = new InMemoryUserRepository();
    passwordResets = new InMemoryPasswordResetRepository();
    emailSender = new StubEmailSender();
    hasher = new StubPasswordHasher();
    useCase = new ResetPassword({
      users,
      passwordResets,
      sessions: new InMemorySessionRepository(),
      clock,
      logger: new SilentLogger(),
      email: emailSender,
      hasher,
    });
  });

  async function seedUserAndToken(opts: { expiresInMs?: number; used?: boolean } = {}) {
    const userResult = await users.create({
      id: "user-1",
      email: "alice@example.com",
      passwordHash: "old-hash",
      firstName: "Alice",
      lastName: "R",
    });
    if (!userResult.ok) throw new Error("seed user failed");
    const rawToken = "raw-token-fixed";
    const tokenHash = sha256(rawToken);
    const expiresAt = new Date(T0.getTime() + (opts.expiresInMs ?? 60 * 60 * 1000));
    const created = await passwordResets.create({
      userId: "user-1",
      tokenHash,
      expiresAt,
    });
    if (!created.ok) throw new Error("seed token failed");
    if (opts.used) {
      await passwordResets.markUsed(created.value.id);
    }
    return { user: userResult.value, rawToken };
  }

  it("resets the password and marks the token used for a valid token", async () => {
    const { rawToken } = await seedUserAndToken();
    const result = await useCase.execute({
      token: rawToken,
      newPassword: "newSecret123",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.userId).toBe("user-1");

    // Token marked used.
    const find = await passwordResets.findByTokenHash(sha256(rawToken));
    expect(find.ok).toBe(true);
    if (find.ok) expect(find.value.usedAt).not.toBeNull();
  });

  it("returns invalid_token for an unknown token", async () => {
    const result = await useCase.execute({
      token: "no-such-token",
      newPassword: "newSecret123",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("invalid_token");
  });

  it("returns token_expired for an expired token", async () => {
    const { rawToken } = await seedUserAndToken({ expiresInMs: -1000 });
    const result = await useCase.execute({
      token: rawToken,
      newPassword: "newSecret123",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("token_expired");
  });

  it("returns token_already_used when the token is consumed", async () => {
    const { rawToken } = await seedUserAndToken({ used: true });
    const result = await useCase.execute({
      token: rawToken,
      newPassword: "newSecret123",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("token_already_used");
  });

  it("returns weak_password for a too-short new password", async () => {
    const { rawToken } = await seedUserAndToken();
    const result = await useCase.execute({
      token: rawToken,
      newPassword: "abc",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("weak_password");
  });
});

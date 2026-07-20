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

class SilentLogger implements Logger {
  debug() {}
  info() {}
  warn() {}
  error() {}
  child() {
    return this;
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
  let useCase: VerifyEmail;

  // Anchor time for the test suite. T0 = Jan 1 2026 00:00:00 UTC.
  const T0 = new Date("2026-01-01T00:00:00Z");

  beforeEach(async () => {
    users = new InMemoryUserRepository();
    emailVerifications = new InMemoryEmailVerificationRepository();
    clock = new FixedClock(T0);
    logger = new SilentLogger();
    useCase = new VerifyEmail({
      emailVerifications,
      users,
      clock,
      logger,
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
    });
    const result = await useCaseWithSpy.execute({ token });

    expect(result.ok).toBe(true);
    expect(seen).toEqual([sha256(token)]);
    expect(seen[0]).not.toBe(token); // sanity: the raw token was NOT used
  });
});

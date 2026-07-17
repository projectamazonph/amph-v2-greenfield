/**
 * Login use case — Story 012 / 013.
 *
 * Tests updated in Story 013 to cover JWT token generation.
 * Original happy-path tests remain — this file REPLACES the stub implementation.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { Result } from "@/domain/shared/Result";
import { InMemoryUserRepository } from "@/infra/repositories/InMemoryUserRepository";
import { InMemorySessionRepository } from "@/infra/repositories/InMemorySessionRepository";
import type { PasswordHasher } from "@/ports/security/PasswordHasher";
import type { JwtService } from "@/ports/security/JwtService";
import { FixedClock } from "@/ports/system/Clock";
import { InMemoryIdGenerator } from "@/infra/system/InMemoryIdGenerator";

class StubHasher implements PasswordHasher {
  async hash(password: string) {
    return { ok: true, value: `stubbed:${password}` } as const;
  }
  async verify(password: string, hash: string) {
    return { ok: true, value: hash === `stubbed:${password}` } as const;
  }
}

describe("Login", () => {
  let userRepo: InMemoryUserRepository;
  let sessionRepo: InMemorySessionRepository;
  let hasher: StubHasher;
  let clock: FixedClock;
  let idGen: InMemoryIdGenerator;
  let useCase: Login;

  beforeEach(async () => {
    userRepo = new InMemoryUserRepository();
    sessionRepo = new InMemorySessionRepository();
    hasher = new StubHasher();
    clock = new FixedClock(new Date("2026-01-01T00:00:00Z"));
    idGen = new InMemoryIdGenerator();
    const jwt: JwtService = {
      async sign(payload, expiresIn) {
        return { ok: true, value: `jwt.${btoa(JSON.stringify({ ...payload, expiresIn }))}.sig` } as const;
      },
      async verify(token) {
        if (!token.startsWith("jwt.")) return { ok: false, error: new Error("invalid") } as const;
        const parts = token.split(".");
        const payloadPart = parts[1];
        if (!payloadPart) return { ok: false, error: new Error("invalid token format") } as const;
        const payload = JSON.parse(atob(payloadPart));
        return { ok: true, value: payload } as const;
      },
    };
    useCase = new Login(userRepo, hasher, sessionRepo, idGen, clock, jwt);

    // Seed a user with a known password
    const storedHash = "stubbed:Str0ngP@ss!";
    const createResult = await userRepo.create({
      id: "user-1",
      email: "alice@example.com",
      passwordHash: storedHash,
      firstName: "Alice",
      lastName: "Rodriguez",
    });
    if (!createResult.ok) throw new Error("seed failed");
  });

  // ── happy path ──────────────────────────────────────────────

  it("returns a session with userId on valid credentials", async () => {
    const result = await useCase.execute({ email: "alice@example.com", password: "Str0ngP@ss!" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.userId).toBe("user-1");
    expect(typeof result.sessionToken).toBe("string");
    expect(result.sessionToken.length).toBeGreaterThan(0);
  });

  it("stores the session in the repository", async () => {
    const result = await useCase.execute({ email: "alice@example.com", password: "Str0ngP@ss!" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(sessionRepo.size()).toBe(1);
  });

  it("session expires 7 days from now", async () => {
    const result = await useCase.execute({ email: "alice@example.com", password: "Str0ngP@ss!" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const expectedExpiry = clock.now().getTime() + sevenDaysMs;
    const actualExpiry = result.expiresAt.getTime();
    expect(Math.abs(actualExpiry - expectedExpiry)).toBeLessThan(2000);
  });

  // ── user_not_found ─────────────────────────────────────────

  it("returns user_not_found for unknown email", async () => {
    const result = await useCase.execute({ email: "nobody@example.com", password: "password" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toEqual({ kind: "user_not_found" });
  });

  it("email comparison is case-insensitive", async () => {
    const result = await useCase.execute({ email: "ALICE@EXAMPLE.COM", password: "Str0ngP@ss!" });
    expect(result.ok).toBe(true);
  });

  // ── wrong_password ─────────────────────────────────────────

  it("returns wrong_password for incorrect password", async () => {
    const result = await useCase.execute({ email: "alice@example.com", password: "WrongPassword!" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toEqual({ kind: "wrong_password" });
  });

  it("no session is created on wrong password", async () => {
    expect(sessionRepo.size()).toBe(0);
    await useCase.execute({ email: "alice@example.com", password: "WrongPassword!" });
    expect(sessionRepo.size()).toBe(0);
  });

  // ── session lifecycle ───────────────────────────────────────

  it("each login creates a new session (no session rotation in this story)", async () => {
    const r1 = await useCase.execute({ email: "alice@example.com", password: "Str0ngP@ss!" });
    const r2 = await useCase.execute({ email: "alice@example.com", password: "Str0ngP@ss!" });
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    if (!r1.ok || !r2.ok) return;
    expect(r1.sessionToken).not.toBe(r2.sessionToken);
    expect(sessionRepo.size()).toBe(2);
  });
});

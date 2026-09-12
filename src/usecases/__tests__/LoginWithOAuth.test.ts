/**
 * LoginWithOAuth tests (P1-04).
 *
 * Pins: existing-link sign-in, email match linking, verified-email
 * auto-signup with audit, unverified rejection, unconfigured
 * provider rejection, suspended/locked/2FA refusals, and session
 * issuance.
 */

import { describe, expect, it, beforeEach } from "vitest";
import { Result } from "@/domain/shared/Result";
import { createOAuthAccount } from "@/domain/entities/OAuthAccount";
import type { OAuthLoginProfile } from "@/usecases/LoginWithOAuth";
import { LoginWithOAuth } from "@/usecases/LoginWithOAuth";
import { InMemoryOAuthAccountRepository } from "@/infra/repositories/inmemory/InMemoryOAuthAccountRepository";
import { InMemoryUserRepository } from "@/infra/repositories/InMemoryUserRepository";
import { InMemorySessionRepository } from "@/infra/repositories/InMemorySessionRepository";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import type { JwtService } from "@/ports/security/JwtService";
import { FixedClock } from "@/ports/system/Clock";
import { InMemoryIdGenerator } from "@/infra/system/InMemoryIdGenerator";
import { SilentLogger } from "@/infra/observability/SilentLogger";

function profile(overrides: Partial<OAuthLoginProfile> = {}): OAuthLoginProfile {
  return {
    provider: "google",
    providerUserId: "google-1",
    email: "student@example.com",
    emailVerified: true,
    name: "Student One",
    accessToken: "tok-1",
    expiresAt: null,
    ...overrides,
  };
}

async function makeDeps() {
  const oauthAccountRepo = new InMemoryOAuthAccountRepository();
  const userRepo = new InMemoryUserRepository();
  const sessionRepo = new InMemorySessionRepository();
  const auditLog = new InMemoryAuditLog();
  const clock = new FixedClock(new Date("2026-09-11T00:00:00Z"));
  const idGen = new InMemoryIdGenerator();
  const jwt: JwtService = {
    async sign(payload, expiresIn) {
      return {
        ok: true,
        value: `jwt.${btoa(JSON.stringify({ ...payload, expiresIn }))}.sig`,
      } as const;
    },
    async verify() {
      return { ok: false, error: new Error("unused") } as const;
    },
  };
  const recordAuditLog = new RecordAuditLog({
    auditLog,
    idGen,
    clock,
    logger: new SilentLogger(),
  });
  const useCase = new LoginWithOAuth({
    oauthAccountRepo,
    userRepo,
    sessionRepo,
    idGen,
    clock,
    jwt,
    recordAuditLog,
    configuredProviders: ["google"],
  });
  await userRepo.create({
    id: "user-1",
    email: "student@example.com",
    passwordHash: "stubbed:secret",
    firstName: "Student",
    lastName: "One",
  });
  return { oauthAccountRepo, userRepo, sessionRepo, auditLog, useCase };
}

describe("LoginWithOAuth", () => {
  let deps: Awaited<ReturnType<typeof makeDeps>>;

  beforeEach(async () => {
    deps = await makeDeps();
  });

  function audited(action: string): boolean {
    return deps.auditLog.getAll().some((entry) => entry.action === action);
  }

  it("signs in through an existing link and refreshes tokens", async () => {
    const built = createOAuthAccount({
      id: "oa-1",
      userId: "user-1",
      provider: "google",
      providerUserId: "google-1",
    });
    if (Result.isErr(built)) throw new Error("setup failed");
    await deps.oauthAccountRepo.create(built.value);

    const result = await deps.useCase.execute({
      profile: profile({ accessToken: "tok-2" }),
    });

    expect(Result.isOk(result)).toBe(true);
    if (Result.isErr(result)) return;
    expect(result.value.userId).toBe("user-1");
    expect(result.value.isNewUser).toBe(false);
    expect(typeof result.value.sessionToken).toBe("string");
    const stored = await deps.oauthAccountRepo.findByProvider("google", "google-1");
    if (Result.isErr(stored) || stored.value === null) throw new Error("setup failed");
    expect(stored.value.accessToken).toBe("tok-2");
    expect(audited("oauth_account.linked")).toBe(false);
  });

  it("links a matching email and signs in", async () => {
    const result = await deps.useCase.execute({ profile: profile() });

    expect(Result.isOk(result)).toBe(true);
    if (Result.isErr(result)) return;
    expect(result.value.userId).toBe("user-1");
    expect(audited("oauth_account.linked")).toBe(true);
  });

  it("auto-creates a passwordless account for a new email", async () => {
    const result = await deps.useCase.execute({
      profile: profile({
        providerUserId: "google-9",
        email: "newcomer@example.com",
        name: "New Comer",
      }),
    });

    expect(Result.isOk(result)).toBe(true);
    if (Result.isErr(result)) return;
    expect(result.value.isNewUser).toBe(true);
    expect(audited("user.signed_up")).toBe(true);
    expect(audited("oauth_account.linked")).toBe(true);
    const hash = await deps.userRepo.getPasswordHash(result.value.userId);
    if (Result.isErr(hash)) throw new Error("setup failed");
    expect(hash.value).toBe("");
  });

  it("derives names from a single-word display name", async () => {
    const result = await deps.useCase.execute({
      profile: profile({
        providerUserId: "google-9",
        email: "solo@example.com",
        name: "Madonna",
      }),
    });

    expect(Result.isOk(result)).toBe(true);
    if (Result.isErr(result)) return;
    const user = await deps.userRepo.findById(result.value.userId);
    if (Result.isErr(user)) throw new Error("setup failed");
    expect(user.value.firstName).toBe("Madonna");
  });

  it("rejects an unverified email", async () => {
    const result = await deps.useCase.execute({
      profile: profile({ emailVerified: false }),
    });

    expect(result).toEqual(Result.err({ kind: "unverified_email" }));
  });

  it("rejects an unconfigured provider", async () => {
    const result = await deps.useCase.execute({
      profile: profile({ provider: "github" }),
    });

    expect(result).toEqual(Result.err({ kind: "provider_not_configured" }));
  });

  it("refuses a suspended account", async () => {
    const baseFind = deps.userRepo.findById.bind(deps.userRepo);
    deps.userRepo.findById = async (id) => {
      const found = await baseFind(id);
      if (Result.isErr(found)) return found;
      return Result.ok({ ...found.value, verificationStatus: "SUSPENDED" as const });
    };

    const result = await deps.useCase.execute({ profile: profile() });

    expect(result).toEqual(Result.err({ kind: "account_suspended" }));
  });

  it("requires password login for 2FA-enabled users", async () => {
    const baseFind = deps.userRepo.findById.bind(deps.userRepo);
    deps.userRepo.findById = async (id) => {
      const found = await baseFind(id);
      if (Result.isErr(found)) return found;
      return Result.ok({ ...found.value, twoFactorEnabled: true });
    };

    const result = await deps.useCase.execute({ profile: profile() });

    expect(result).toEqual(Result.err({ kind: "two_factor_required" }));
  });
});

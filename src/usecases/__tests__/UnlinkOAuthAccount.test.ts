/**
 * UnlinkOAuthAccount tests (P1-04).
 *
 * Pins: happy-path unlink with audit, missing link, and the
 * last-auth-method guard in both directions (password present
 * allows it, another link allows it).
 */

import { describe, expect, it } from "vitest";
import { Result } from "@/domain/shared/Result";
import { createOAuthAccount } from "@/domain/entities/OAuthAccount";
import { UnlinkOAuthAccount } from "@/usecases/UnlinkOAuthAccount";
import { InMemoryOAuthAccountRepository } from "@/infra/repositories/inmemory/InMemoryOAuthAccountRepository";
import { InMemoryUserRepository } from "@/infra/repositories/InMemoryUserRepository";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { FixedClock } from "@/ports/system/Clock";
import { SilentLogger } from "@/infra/observability/SilentLogger";

async function makeDeps(passwordHash: string) {
  const oauthAccountRepo = new InMemoryOAuthAccountRepository();
  const userRepo = new InMemoryUserRepository();
  const auditLog = new InMemoryAuditLog();
  const clock = new FixedClock(new Date("2026-09-11T00:00:00Z"));
  const recordAuditLog = new RecordAuditLog({
    auditLog,
    idGen: { newId: () => "audit_1", paymentRef: () => "x", receiptNumber: () => "x" },
    clock,
    logger: new SilentLogger(),
  });
  await userRepo.create({
    id: "user-1",
    email: "student@example.com",
    passwordHash,
    firstName: "Student",
    lastName: "One",
  });
  const useCase = new UnlinkOAuthAccount({ oauthAccountRepo, userRepo, recordAuditLog });

  async function link(id: string, provider: "google" | "github" = "google") {
    const built = createOAuthAccount({
      id,
      userId: "user-1",
      provider,
      providerUserId: `${provider}-1`,
    });
    if (Result.isErr(built)) throw new Error("setup failed");
    await oauthAccountRepo.create(built.value);
  }

  return { oauthAccountRepo, auditLog, useCase, link };
}

describe("UnlinkOAuthAccount", () => {
  it("unlinks when the user has a password and audits", async () => {
    const deps = await makeDeps("stubbed:secret");
    await deps.link("oa-1");

    const result = await deps.useCase.execute({ userId: "user-1", provider: "google" });

    expect(result).toEqual(Result.ok(undefined));
    expect(
      deps.auditLog.getAll().some((entry) => entry.action === "oauth_account.unlinked"),
    ).toBe(true);
  });

  it("unlinks when another provider link survives", async () => {
    const deps = await makeDeps("");
    await deps.link("oa-1", "google");
    await deps.link("oa-2", "github");

    const result = await deps.useCase.execute({ userId: "user-1", provider: "google" });

    expect(result).toEqual(Result.ok(undefined));
    const remaining = await deps.oauthAccountRepo.listByUser("user-1");
    if (Result.isErr(remaining)) throw new Error("expected ok");
    expect(remaining.value.map((row) => row.provider)).toEqual(["github"]);
  });

  it("refuses to remove the last auth method", async () => {
    const deps = await makeDeps("");
    await deps.link("oa-1");

    const result = await deps.useCase.execute({ userId: "user-1", provider: "google" });

    expect(result).toEqual(Result.err({ kind: "last_auth_method" }));
    expect(
      deps.auditLog.getAll().some((entry) => entry.action === "oauth_account.unlink_failed"),
    ).toBe(true);
  });

  it("reports a missing link", async () => {
    const deps = await makeDeps("stubbed:secret");

    const result = await deps.useCase.execute({ userId: "user-1", provider: "google" });

    expect(result).toEqual(Result.err({ kind: "link_not_found" }));
  });
});

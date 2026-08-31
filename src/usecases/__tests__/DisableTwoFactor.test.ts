/**
 * DisableTwoFactor.test.ts — admin TOTP 2FA (audit hardening follow-up).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { DisableTwoFactor } from "@/usecases/DisableTwoFactor";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { InMemoryUserRepository } from "@/infra/repositories/InMemoryUserRepository";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { FixedClock } from "@/ports/system/Clock";
import type { PasswordHasher } from "@/ports/security/PasswordHasher";
import { Result } from "@/domain/shared/Result";
import { SilentLogger } from "@/infra/observability/SilentLogger";

class StubHasher implements PasswordHasher {
  async hash(password: string) {
    return Result.ok(`stubbed:${password}`);
  }
  async verify(password: string, hash: string) {
    return Result.ok(hash === `stubbed:${password}`);
  }
}

describe("DisableTwoFactor", () => {
  let userRepo: InMemoryUserRepository;
  let hasher: StubHasher;
  let auditLog: InMemoryAuditLog;
  let recordAuditLog: RecordAuditLog;
  let useCase: DisableTwoFactor;

  beforeEach(async () => {
    userRepo = new InMemoryUserRepository();
    hasher = new StubHasher();
    auditLog = new InMemoryAuditLog();
    recordAuditLog = new RecordAuditLog({
      auditLog,
      idGen: { newId: () => "ale_1", paymentRef: () => "x", receiptNumber: () => "x" },
      clock: new FixedClock(new Date()),
      logger: new SilentLogger(),
    });
    useCase = new DisableTwoFactor({ userRepo, hasher, recordAuditLog });

    await userRepo.create({
      id: "admin_1",
      email: "admin@example.com",
      passwordHash: "stubbed:CorrectP@ssw0rd",
      firstName: "Admin",
      lastName: "User",
    });
    await userRepo.setTwoFactorSecret("admin_1", "SOMESECRET");
    await userRepo.update("admin_1", { twoFactorEnabled: true });
  });

  it("clears the secret and disables 2FA when the password is correct", async () => {
    const result = await useCase.execute({ userId: "admin_1", password: "CorrectP@ssw0rd" });
    expect(result.ok).toBe(true);

    const found = await userRepo.findById("admin_1");
    expect(found.ok && found.value.twoFactorEnabled).toBe(false);

    const secret = await userRepo.getTwoFactorSecret("admin_1");
    expect(secret.ok && secret.value).toBeNull();
  });

  it("records a user.2fa_disabled audit entry on success", async () => {
    await useCase.execute({ userId: "admin_1", password: "CorrectP@ssw0rd" });
    const entries = auditLog.getAll();
    expect(entries.some((e) => e.action === "user.2fa_disabled" && e.targetId === "admin_1")).toBe(
      true,
    );
  });

  it("returns wrong_password and leaves 2FA enabled for an incorrect password", async () => {
    const result = await useCase.execute({ userId: "admin_1", password: "WrongPassword" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("wrong_password");

    const found = await userRepo.findById("admin_1");
    expect(found.ok && found.value.twoFactorEnabled).toBe(true);
  });

  it("returns user_not_found for a nonexistent user", async () => {
    const result = await useCase.execute({ userId: "nobody", password: "whatever" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("user_not_found");
  });
});

/**
 * ConfirmTwoFactor.test.ts — admin TOTP 2FA (audit hardening follow-up).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ConfirmTwoFactor } from "@/usecases/ConfirmTwoFactor";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { InMemoryUserRepository } from "@/infra/repositories/InMemoryUserRepository";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { FakeTotpService } from "@/infra/security/FakeTotpService";
import { FixedClock } from "@/ports/system/Clock";

describe("ConfirmTwoFactor", () => {
  let userRepo: InMemoryUserRepository;
  let totpService: FakeTotpService;
  let auditLog: InMemoryAuditLog;
  let recordAuditLog: RecordAuditLog;
  let useCase: ConfirmTwoFactor;

  beforeEach(async () => {
    userRepo = new InMemoryUserRepository();
    totpService = new FakeTotpService("123456");
    auditLog = new InMemoryAuditLog();
    recordAuditLog = new RecordAuditLog({
      auditLog,
      idGen: { newId: () => "ale_1", paymentRef: () => "x", receiptNumber: () => "x" },
      clock: new FixedClock(new Date()),
    });
    useCase = new ConfirmTwoFactor({ userRepo, totpService, recordAuditLog });

    await userRepo.create({
      id: "admin_1",
      email: "admin@example.com",
      passwordHash: "stubbed:pw",
      firstName: "Admin",
      lastName: "User",
    });
    await userRepo.setTwoFactorSecret("admin_1", "PENDINGSECRET");
  });

  it("enables 2FA when the code matches the pending secret", async () => {
    const result = await useCase.execute({ userId: "admin_1", code: "123456" });
    expect(result.ok).toBe(true);

    const found = await userRepo.findById("admin_1");
    expect(found.ok && found.value.twoFactorEnabled).toBe(true);
  });

  it("records a user.2fa_enabled audit entry on success", async () => {
    await useCase.execute({ userId: "admin_1", code: "123456" });
    const entries = auditLog.getAll();
    expect(entries.some((e) => e.action === "user.2fa_enabled" && e.targetId === "admin_1")).toBe(
      true,
    );
  });

  it("returns invalid_code and does not enable 2FA for a wrong code", async () => {
    const result = await useCase.execute({ userId: "admin_1", code: "000000" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("invalid_code");

    const found = await userRepo.findById("admin_1");
    expect(found.ok && found.value.twoFactorEnabled).toBe(false);
  });

  it("returns no_pending_secret when EnableTwoFactor was never called", async () => {
    await userRepo.setTwoFactorSecret("admin_1", null);
    const result = await useCase.execute({ userId: "admin_1", code: "123456" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("no_pending_secret");
  });

  it("returns user_not_found for a nonexistent user", async () => {
    const result = await useCase.execute({ userId: "nobody", code: "123456" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("user_not_found");
  });
});

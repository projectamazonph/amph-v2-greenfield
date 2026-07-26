/**
 * EnableTwoFactor.test.ts — admin TOTP 2FA (audit hardening follow-up).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { EnableTwoFactor } from "@/usecases/EnableTwoFactor";
import { InMemoryUserRepository } from "@/infra/repositories/InMemoryUserRepository";
import { FakeTotpService } from "@/infra/security/FakeTotpService";

describe("EnableTwoFactor", () => {
  let userRepo: InMemoryUserRepository;
  let totpService: FakeTotpService;
  let useCase: EnableTwoFactor;

  beforeEach(async () => {
    userRepo = new InMemoryUserRepository();
    totpService = new FakeTotpService();
    useCase = new EnableTwoFactor({ userRepo, totpService });

    await userRepo.create({
      id: "admin_1",
      email: "admin@example.com",
      passwordHash: "stubbed:pw",
      firstName: "Admin",
      lastName: "User",
    });
  });

  it("generates and persists a pending secret, returning it with a keyUri", async () => {
    const result = await useCase.execute({ userId: "admin_1" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.secret).toBe("FAKEBASE32SECRETFORTESTS");
    expect(result.value.keyUri).toContain("FAKEBASE32SECRETFORTESTS");
    expect(result.value.keyUri).toContain("admin@example.com");

    const stored = await userRepo.getTwoFactorSecret("admin_1");
    expect(stored.ok && stored.value).toBe("FAKEBASE32SECRETFORTESTS");
  });

  it("does not enable 2FA yet — only ConfirmTwoFactor does that", async () => {
    await useCase.execute({ userId: "admin_1" });
    const found = await userRepo.findById("admin_1");
    expect(found.ok && found.value.twoFactorEnabled).toBe(false);
  });

  it("returns user_not_found for a nonexistent user", async () => {
    const result = await useCase.execute({ userId: "nobody" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("user_not_found");
  });

  it("returns already_enabled when 2FA is already on", async () => {
    await useCase.execute({ userId: "admin_1" });
    await userRepo.update("admin_1", { twoFactorEnabled: true });

    const result = await useCase.execute({ userId: "admin_1" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("already_enabled");
  });

  it("overwrites a previous pending secret when called again before confirming", async () => {
    const first = await useCase.execute({ userId: "admin_1" });
    expect(first.ok).toBe(true);

    // Different service instance so generateSecret() returns something else,
    // proving the second call's secret replaces the first's in storage.
    const otherTotpService = new (class extends FakeTotpService {
      generateSecret() {
        return "SECONDSECRETXYZ";
      }
    })();
    const secondUseCase = new EnableTwoFactor({ userRepo, totpService: otherTotpService });
    await secondUseCase.execute({ userId: "admin_1" });

    const stored = await userRepo.getTwoFactorSecret("admin_1");
    expect(stored.ok && stored.value).toBe("SECONDSECRETXYZ");
  });
});

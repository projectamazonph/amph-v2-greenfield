/**
 * twoFactor.action.test.ts — admin TOTP 2FA (audit hardening follow-up).
 *
 * Tests the pure perform* helpers (mirrors login.action.test.ts's
 * approach) — the thin action wrappers just add session resolution +
 * redirect(), which needs the Next.js runtime and is exercised
 * end-to-end by the use case tests instead.
 */

import { describe, it, expect } from "vitest";

// Mock server-only so src/lib/auth.ts can be imported transitively.
import { vi } from "vitest";
vi.mock("server-only", () => ({}));

import {
  performEnableTwoFactor,
  performConfirmTwoFactor,
  performDisableTwoFactor,
} from "../twoFactor.action";
import { buildTestContainer } from "@/composition/container.test";

function freshContainer() {
  return buildTestContainer();
}

async function seedAdmin(container: ReturnType<typeof buildTestContainer>) {
  await container.userRepo.create({
    id: "admin_1",
    email: "admin@example.com",
    passwordHash: "",
    firstName: "Admin",
    lastName: "User",
  });
  const hashResult = await import("@/infra/security/Argon2PasswordHasher").then((m) =>
    new m.Argon2PasswordHasher().hash("CorrectP@ssw0rd"),
  );
  if (!hashResult.ok) throw new Error("hash failed");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (container.userRepo as any).passwordHashes.set("admin_1", hashResult.value);
}

describe("performEnableTwoFactor", () => {
  it("returns a secret and keyUri, and persists the pending secret", async () => {
    const container = freshContainer();
    await seedAdmin(container);

    const result = await performEnableTwoFactor(container, "admin_1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.secret).toBeTruthy();
    expect(result.value.keyUri).toContain(result.value.secret);

    const stored = await container.userRepo.getTwoFactorSecret("admin_1");
    expect(stored.ok && stored.value).toBe(result.value.secret);
  });
});

describe("performConfirmTwoFactor", () => {
  it("enables 2FA when the code matches the pending secret", async () => {
    const container = freshContainer();
    await seedAdmin(container);
    const enableResult = await performEnableTwoFactor(container, "admin_1");
    expect(enableResult.ok).toBe(true);

    // FakeTotpService (wired into buildTestContainer) accepts a fixed code.
    const result = await performConfirmTwoFactor(container, "admin_1", "123456");
    expect(result.ok).toBe(true);

    const found = await container.userRepo.findById("admin_1");
    expect(found.ok && found.value.twoFactorEnabled).toBe(true);
  });

  it("returns invalid_code for a wrong code", async () => {
    const container = freshContainer();
    await seedAdmin(container);
    await performEnableTwoFactor(container, "admin_1");

    const result = await performConfirmTwoFactor(container, "admin_1", "000000");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("invalid_code");
  });
});

describe("performDisableTwoFactor", () => {
  async function seedEnabledAdmin(container: ReturnType<typeof buildTestContainer>) {
    await seedAdmin(container);
    await container.userRepo.setTwoFactorSecret("admin_1", "SOMESECRET");
    await container.userRepo.update("admin_1", { twoFactorEnabled: true });
  }

  it("disables 2FA when the password is correct", async () => {
    const container = freshContainer();
    await seedEnabledAdmin(container);

    const result = await performDisableTwoFactor(container, "admin_1", "CorrectP@ssw0rd");
    expect(result.ok).toBe(true);

    const found = await container.userRepo.findById("admin_1");
    expect(found.ok && found.value.twoFactorEnabled).toBe(false);
  });

  it("returns wrong_password and leaves 2FA enabled for an incorrect password", async () => {
    const container = freshContainer();
    await seedEnabledAdmin(container);

    const result = await performDisableTwoFactor(container, "admin_1", "WrongPassword");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("wrong_password");

    const found = await container.userRepo.findById("admin_1");
    expect(found.ok && found.value.twoFactorEnabled).toBe(true);
  });
});

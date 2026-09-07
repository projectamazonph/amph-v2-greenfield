/**
 * Unit tests for the admin-seed TOTP interop.
 *
 * TDD history: E2E journey 3 ("admin login and create discount
 * code") failed deterministically in CI at the discount-code form
 * fill — the page had bounced back to /admin-login. Root cause:
 * seedAdminUser() set twoFactorEnabled=true with NO stored secret,
 * so Login returned totp_required and created no session, while the
 * journey's `toHaveURL(/\/admin/)` assertion passed spuriously on
 * the "/admin-login" substring. The seed now mints a real TOTP
 * secret (same otpauth params as OtpauthTotpService) and the journeys
 * submit the current code. These tests pin the interop the journeys
 * depend on — a code minted by currentTotpCode() MUST verify under
 * the production verifier — without needing a database.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { currentTotpCode, seedAdminUser } from "../../e2e/helpers/seed";
import { OtpauthTotpService } from "@/infra/security/OtpauthTotpService";

describe("seedAdminUser TOTP interop", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("seedAdminUser is a no-op (null) when databaseUrl is empty", async () => {
    await expect(seedAdminUser("")).resolves.toBeNull();
  });

  it("currentTotpCode mints a 6-digit code for a fresh secret", async () => {
    const { Secret } = await import("otpauth");
    const secret = new Secret({ size: 20 }).base32;
    const code = await currentTotpCode(secret);
    expect(code).toMatch(/^\d{6}$/);
  });

  it("a minted code verifies under the production OtpauthTotpService", async () => {
    const { Secret } = await import("otpauth");
    const secret = new Secret({ size: 20 }).base32;
    const verifier = new OtpauthTotpService();
    const code = await currentTotpCode(secret);
    expect(verifier.verify(secret, code)).toBe(true);
  });

  it("a code minted for one secret does not verify under another", async () => {
    const { Secret } = await import("otpauth");
    const verifier = new OtpauthTotpService();
    const code = await currentTotpCode(new Secret({ size: 20 }).base32);
    expect(verifier.verify(new Secret({ size: 20 }).base32, code)).toBe(false);
  });
});

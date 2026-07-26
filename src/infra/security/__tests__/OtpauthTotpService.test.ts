/**
 * OtpauthTotpService.test.ts — admin TOTP 2FA.
 */

import { describe, it, expect } from "vitest";
import { TOTP, Secret } from "otpauth";
import { OtpauthTotpService } from "@/infra/security/OtpauthTotpService";

describe("OtpauthTotpService", () => {
  const service = new OtpauthTotpService();

  it("generateSecret() returns a base32 string of reasonable length", () => {
    const secret = service.generateSecret();
    expect(typeof secret).toBe("string");
    // base32 alphabet only
    expect(secret).toMatch(/^[A-Z2-7]+$/);
    expect(secret.length).toBeGreaterThanOrEqual(16);
  });

  it("generateSecret() returns a different value each call", () => {
    const a = service.generateSecret();
    const b = service.generateSecret();
    expect(a).not.toBe(b);
  });

  it("keyUri() produces a valid otpauth:// URI containing the issuer and account", () => {
    const secret = service.generateSecret();
    const uri = service.keyUri({
      secret,
      accountName: "admin@example.com",
      issuer: "Project Amazon PH Academy",
    });
    expect(uri).toMatch(/^otpauth:\/\/totp\//);
    expect(uri).toContain(encodeURIComponent("admin@example.com"));
    expect(decodeURIComponent(uri)).toContain("Project Amazon PH Academy");
  });

  it("verify() accepts a code generated from the same secret", () => {
    const secret = service.generateSecret();
    const totp = new TOTP({ secret: Secret.fromBase32(secret), digits: 6, period: 30 });
    const code = totp.generate();
    expect(service.verify(secret, code)).toBe(true);
  });

  it("verify() rejects a code generated from a different secret", () => {
    const secret = service.generateSecret();
    const otherSecret = service.generateSecret();
    const totp = new TOTP({ secret: Secret.fromBase32(otherSecret), digits: 6, period: 30 });
    const code = totp.generate();
    expect(service.verify(secret, code)).toBe(false);
  });

  it("verify() rejects a malformed code", () => {
    const secret = service.generateSecret();
    expect(service.verify(secret, "not-a-code")).toBe(false);
    expect(service.verify(secret, "")).toBe(false);
  });

  it("verify() accepts a code from one time-step in the past (clock skew tolerance)", () => {
    const secret = service.generateSecret();
    const totp = new TOTP({ secret: Secret.fromBase32(secret), digits: 6, period: 30 });
    const previousStepCode = totp.generate({ timestamp: Date.now() - 30_000 });
    expect(service.verify(secret, previousStepCode)).toBe(true);
  });

  it("verify() rejects a code far outside the tolerance window", () => {
    const secret = service.generateSecret();
    const totp = new TOTP({ secret: Secret.fromBase32(secret), digits: 6, period: 30 });
    const farPastCode = totp.generate({ timestamp: Date.now() - 30 * 60_000 }); // 30 minutes ago
    expect(service.verify(secret, farPastCode)).toBe(false);
  });
});

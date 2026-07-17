/**
 * JwtService tests — Story 013.
 *
 * TDD Chunk 1: define the JwtService port contract via its tests.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { JwtService } from "@/ports/security/JwtService";
import { Result } from "@/domain/shared/Result";

/** Minimal test implementation of JwtService using jose under the hood. */
class JoseJwtService implements JwtService {
  constructor(private readonly secret: string) {}

  async sign(payload: Record<string, unknown>, expiresIn: string): Promise<Result<string, Error>> {
    try {
      const { SignJWT } = await import("jose");
      const secret = new TextEncoder().encode(this.secret);
      const token = await new SignJWT(payload as Record<string, unknown>)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(expiresIn)
        .sign(secret);
      return Result.ok(token);
    } catch (e) {
      return Result.err(e as Error);
    }
  }

  async verify(token: string): Promise<Result<Record<string, unknown>, Error>> {
    try {
      const { jwtVerify } = await import("jose");
      const secret = new TextEncoder().encode(this.secret);
      const { payload } = await jwtVerify(token, secret);
      return Result.ok(payload as Record<string, unknown>);
    } catch (e) {
      return Result.err(e as Error);
    }
  }
}

describe("JwtService", () => {
  const secret = "test-secret-at-least-32-chars-long!!";
  let service: JwtService;

  beforeEach(() => {
    service = new JoseJwtService(secret);
  });

  describe("sign", () => {
    it("returns ok with a signed JWT string", async () => {
      const result = await service.sign({ sub: "user-1", role: "STUDENT" }, "7d");
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(typeof result.value).toBe("string");
      expect(result.value.split(".")).toHaveLength(3); // JWS compact serialization
    });

    it("includes the payload claims in the signed JWT", async () => {
      const payload = { sub: "user-1", role: "ADMIN" };
      const signed = await service.sign(payload, "1h");
      if (!signed.ok) { throw new Error("sign failed: " + String(signed.error)); }
      const verified = await service.verify(signed.value);
      expect(verified.ok).toBe(true);
      if (!verified.ok) return;
      expect(verified.value.sub).toBe("user-1");
      expect(verified.value.role).toBe("ADMIN");
    });

    it("returns err when signing fails", async () => {
      // Pass a non-object payload to trigger a signing error
      const result = await service.sign(null as unknown as Record<string, unknown>, "1h");
      expect(result.ok).toBe(false);
    });
  });

  describe("verify", () => {
    it("returns ok with decoded payload for a valid token", async () => {
      const signed = await service.sign({ sub: "user-1" }, "7d");
      if (!signed.ok) { throw new Error("setup failed: " + String(signed.error)); }
      const result = await service.verify(signed.value);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.sub).toBe("user-1");
    });

    it("returns err for a malformed token", async () => {
      const result = await service.verify("not.a.jwt");
      expect(result.ok).toBe(false);
    });

    it("returns err for a token signed with a different secret", async () => {
      const otherService = new JoseJwtService("completely-different-secret-that-is-32chars!!");
      const signed = await otherService.sign({ sub: "user-1" }, "7d");
      if (!signed.ok) { throw new Error("setup failed: " + String(signed.error)); }
      const result = await service.verify(signed.value);
      expect(result.ok).toBe(false);
    });

    it("returns err for an expired token", async () => {
      const signed = await service.sign({ sub: "user-1" }, "-1s"); // already expired
      if (!signed.ok) { throw new Error("setup failed: " + String(signed.error)); }
      const result = await service.verify(signed.value);
      expect(result.ok).toBe(false);
    });
  });

  describe("token shape", () => {
    it("token has iat and exp claims for a 7d expiry", async () => {
      const signed = await service.sign({ sub: "user-1" }, "7d");
      if (!signed.ok) { throw new Error("setup failed: " + String(signed.error)); }
      const verified = await service.verify(signed.value);
      expect(verified.ok).toBe(true);
      if (!verified.ok) return;
      expect(typeof verified.value.iat).toBe("number");
      expect(typeof verified.value.exp).toBe("number");
      // exp - iat should be approximately 7 days in seconds
      const sevenDaysSeconds = 7 * 24 * 60 * 60;
      const diff = Math.abs((verified.value.exp as number) - (verified.value.iat as number) - sevenDaysSeconds);
      expect(diff).toBeLessThan(5);
    });
  });
});

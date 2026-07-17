/**
 * Middleware tests — Story 013.
 *
 * Tests JWT verification in Next.js middleware.
 */

import { describe, it, expect, beforeEach } from "vitest";
import type { NextRequest } from "next/server";
import { JoseJwtService } from "@/infra/security/JoseJwtService";
import { Result } from "@/lib/Result";

const SECRET = "test-secret-at-least-32-characters-long!!";

describe("JoseJwtService (middleware integration)", () => {
  let jwt: JoseJwtService;

  beforeEach(() => {
    jwt = new JoseJwtService(SECRET);
  });

  it("can be used to verify a token in middleware flow", async () => {
    // Simulate login: sign a JWT
    const loginResult = await jwt.sign({ sub: "user-1", sessionId: "session-1", role: "STUDENT" }, "7d");
    expect(loginResult.ok).toBe(true);
    if (!loginResult.ok) return;
    const token = loginResult.value;

    // Simulate middleware: verify the token
    const verifyResult = await jwt.verify(token);
    expect(verifyResult.ok).toBe(true);
    if (!verifyResult.ok) return;
    expect(verifyResult.value.sub).toBe("user-1");
    expect(verifyResult.value.sessionId).toBe("session-1");
    expect(verifyResult.value.role).toBe("STUDENT");
  });

  it("rejects a token with a wrong secret", async () => {
    const otherJwt = new JoseJwtService("different-secret-32-chars-minimum!!");
    const signed = await otherJwt.sign({ sub: "user-1" }, "7d");
    if (!signed.ok) return;
    const result = await jwt.verify(signed.value);
    expect(result.ok).toBe(false);
  });

  it("rejects an expired token", async () => {
    const signed = await jwt.sign({ sub: "user-1" }, "-1s");
    if (!signed.ok) return;
    const result = await jwt.verify(signed.value);
    expect(result.ok).toBe(false);
  });

  it("rejects a malformed token", async () => {
    const result = await jwt.verify("not.a.valid.jwt.string");
    expect(result.ok).toBe(false);
  });
});

describe("JwtService factory behavior", () => {
  it("JoseJwtService throws if secret is too short", () => {
    expect(() => new JoseJwtService("short")).toThrow("JWT_SECRET must be at least 32 characters");
  });

  it("JoseJwtService accepts a 32-char secret", () => {
    expect(() => new JoseJwtService("12345678901234567890123456789012")).not.toThrow();
  });
});

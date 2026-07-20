/**
 * JoseJwtService integration test — STORY-010.
 *
 * Real jose calls, no mocks. Exercises sign + verify, expiry, tampering,
 * wrong-secret, and the constructor's secret length check.
 */

import { describe, it, expect } from "vitest";
import { JoseJwtService } from "@/infra/security/JoseJwtService";
import { Result } from "@/domain/shared/Result";
import { SignJWT } from "jose";

const VALID_SECRET = "a-very-long-secret-for-hs256-must-be-at-least-32-chars";
const OTHER_SECRET = "a-completely-different-also-32-plus-chars-long-secret";

describe("JoseJwtService (integration)", () => {
  // ── constructor guard ────────────────────────────────

  it("rejects secrets shorter than 32 characters at construction time", () => {
    expect(() => new JoseJwtService("short")).toThrow(/at least 32 characters/);
    expect(() => new JoseJwtService("")).toThrow(/at least 32 characters/);
  });

  // ── happy path ───────────────────────────────────────

  it("signs a payload and verifies it back to the same claims", async () => {
    const svc = new JoseJwtService(VALID_SECRET);
    const sign = await svc.sign(
      { sub: "user-1", sessionId: "sess-1", role: "student" },
      "1h",
    );
    expect(sign.ok).toBe(true);
    if (!sign.ok) return;
    const token = sign.value;
    expect(token.split(".").length).toBe(3); // header.payload.signature

    const verify = await svc.verify(token);
    expect(verify.ok).toBe(true);
    if (!verify.ok) return;
    expect(verify.value["sub"]).toBe("user-1");
    expect(verify.value["sessionId"]).toBe("sess-1");
    expect(verify.value["role"]).toBe("student");
  });

  // ── expired token ────────────────────────────────────

  it("returns an error for an expired token", async () => {
    const svc = new JoseJwtService(VALID_SECRET);
    // Use jose directly to mint an already-expired token.
    const secret = new TextEncoder().encode(VALID_SECRET);
    const expired = await new SignJWT({ sub: "user-1" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 7200) // 2h ago
      .setExpirationTime(Math.floor(Date.now() / 1000) - 3600) // 1h ago
      .sign(secret);
    const verify = await svc.verify(expired);
    expect(verify.ok).toBe(false);
  });

  // ── tampered token ───────────────────────────────────

  it("returns an error for a token with tampered payload", async () => {
    const svc = new JoseJwtService(VALID_SECRET);
    const sign = await svc.sign({ sub: "user-1", role: "student" }, "1h");
    expect(sign.ok).toBe(true);
    if (!sign.ok) return;
    const parts = sign.value.split(".");
    expect(parts.length).toBe(3);
    // Replace the payload with a forged "sub" but keep the original signature.
    const forgedPayload = Buffer.from(
      JSON.stringify({ sub: "attacker", role: "admin" }),
    ).toString("base64url");
    const tampered = `${parts[0]}.${forgedPayload}.${parts[2]}`;

    const verify = await svc.verify(tampered);
    expect(verify.ok).toBe(false);
  });

  it("returns an error for a token with a tampered signature", async () => {
    const svc = new JoseJwtService(VALID_SECRET);
    const sign = await svc.sign({ sub: "user-1" }, "1h");
    expect(sign.ok).toBe(true);
    if (!sign.ok) return;
    const parts = sign.value.split(".");
    // Replace the entire signature with a different (definitely
    // invalid) base64url string. Flipping a single character was
    // flaky because by rare chance the new char could decode to a
    // valid (but different) signature.
    const tampered = `${parts[0]}.${parts[1]}.${"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"}`;

    const verify = await svc.verify(tampered);
    expect(verify.ok).toBe(false);
  });

  // ── wrong-secret token ──────────────────────────────

  it("returns an error for a token signed with a different secret", async () => {
    const signer = new JoseJwtService(VALID_SECRET);
    const verifier = new JoseJwtService(OTHER_SECRET);
    const sign = await signer.sign({ sub: "user-1" }, "1h");
    expect(sign.ok).toBe(true);
    if (!sign.ok) return;
    const verify = await verifier.verify(sign.value);
    expect(verify.ok).toBe(false);
  });

  // ── malformed token ──────────────────────────────────

  it("returns an error for a malformed token (not a JWT)", async () => {
    const svc = new JoseJwtService(VALID_SECRET);
    const result = await svc.verify("not-a-jwt");
    expect(result.ok).toBe(false);
  });

  it("returns an error for a token with wrong segment count", async () => {
    const svc = new JoseJwtService(VALID_SECRET);
    const result = await svc.verify("only.two");
    expect(result.ok).toBe(false);
  });

  it("returns an error for an empty token", async () => {
    const svc = new JoseJwtService(VALID_SECRET);
    const result = await svc.verify("");
    expect(result.ok).toBe(false);
  });
});

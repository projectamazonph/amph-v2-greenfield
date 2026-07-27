/**
 * POST /api/webhooks/resend/webhook — unit tests for signature verification.
 */

import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";

// Re-implement verifySignature inline for unit testing without HTTP layer.
// This mirrors the logic in ../route.ts.
function verifySignature(rawBody: string, header: string, secret: string): boolean {
  if (!header || !secret) return false;

  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  const timestamp = parts["t"];
  const signature = parts["v1"];

  if (!timestamp || !signature) return false;

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (age > 300) return false;

  const expectedSig = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");

  try {
    return Buffer.compare(Buffer.from(signature), Buffer.from(expectedSig)) === 0;
  } catch {
    return false;
  }
}

function makeSignature(body: string, secret: string, timestampOffset = 0): string {
  const ts = Math.floor(Date.now() / 1000) + timestampOffset;
  const sig = createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex");
  return `t=${ts},v1=${sig}`;
}

describe("Resend webhook signature verification", () => {
  const SECRET = "whsec_test123";
  const BODY = JSON.stringify({ type: "email.bounced", data: { id: "evt_123" } });

  it("accepts a valid signature", () => {
    const sig = makeSignature(BODY, SECRET);
    expect(verifySignature(BODY, sig, SECRET)).toBe(true);
  });

  it("rejects a wrong secret", () => {
    const sig = makeSignature(BODY, "wrong-secret");
    expect(verifySignature(BODY, sig, SECRET)).toBe(false);
  });

  it("rejects an empty header", () => {
    expect(verifySignature(BODY, "", SECRET)).toBe(false);
  });

  it("rejects a header with no v1 part", () => {
    expect(verifySignature(BODY, "t=12345", SECRET)).toBe(false);
  });

  it("rejects a tampered body", () => {
    const sig = makeSignature(BODY, SECRET);
    expect(verifySignature('{"type":"email.sent"}', sig, SECRET)).toBe(false);
  });

  it("rejects an expired timestamp (> 5 minutes old)", () => {
    const sig = makeSignature(BODY, SECRET, -400); // 400 seconds ago
    expect(verifySignature(BODY, sig, SECRET)).toBe(false);
  });

  it("accepts a timestamp just within the 5-minute window", () => {
    const sig = makeSignature(BODY, SECRET, -299); // 299 seconds ago
    expect(verifySignature(BODY, sig, SECRET)).toBe(true);
  });
});

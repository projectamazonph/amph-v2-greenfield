/**
 * POST /api/webhooks/resend/webhook — unit tests for signature verification.
 */

import { describe, it, expect, vi } from "vitest";
import { createHmac } from "node:crypto";

vi.mock("server-only", () => ({}));

import { verifyResendWebhookSignature } from "../route";

const NOW = 1_800_000_000_000;
const WEBHOOK_ID = "msg_3JZ3g4I7TOUDy2yX7KXoLkPQlnF";

function makeSignature(
  body: string,
  secret: string,
  timestampOffset = 0,
): {
  id: string;
  timestamp: string;
  signature: string;
} {
  const timestamp = String(Math.floor(NOW / 1000) + timestampOffset);
  const secretPayload = secret.slice("whsec_".length);
  const signature = createHmac("sha256", Buffer.from(secretPayload, "base64"))
    .update(`${WEBHOOK_ID}.${timestamp}.${body}`)
    .digest("base64");
  return { id: WEBHOOK_ID, timestamp, signature: `v1,${signature}` };
}

describe("Resend webhook signature verification", () => {
  const SECRET = `whsec_${Buffer.from("resend-test-webhook-secret").toString("base64")}`;
  const BODY = JSON.stringify({ type: "email.bounced", data: { email_id: "email_123" } });

  it("accepts a valid Svix signature", () => {
    const sig = makeSignature(BODY, SECRET);
    expect(verifyResendWebhookSignature(BODY, sig, SECRET, NOW)).toBe(true);
  });

  it("rejects a wrong secret", () => {
    const sig = makeSignature(BODY, "wrong-secret");
    expect(verifyResendWebhookSignature(BODY, sig, SECRET, NOW)).toBe(false);
  });

  it("rejects missing Svix headers", () => {
    expect(
      verifyResendWebhookSignature(BODY, { id: "", timestamp: "", signature: "" }, SECRET, NOW),
    ).toBe(false);
  });

  it("rejects a signature with no v1 version", () => {
    const sig = makeSignature(BODY, SECRET);
    expect(
      verifyResendWebhookSignature(BODY, { ...sig, signature: "v2,invalid" }, SECRET, NOW),
    ).toBe(false);
  });

  it("rejects a tampered body", () => {
    const sig = makeSignature(BODY, SECRET);
    expect(verifyResendWebhookSignature('{"type":"email.sent"}', sig, SECRET, NOW)).toBe(false);
  });

  it("rejects an expired timestamp (> 5 minutes old)", () => {
    const sig = makeSignature(BODY, SECRET, -400); // 400 seconds ago
    expect(verifyResendWebhookSignature(BODY, sig, SECRET, NOW)).toBe(false);
  });

  it("accepts a timestamp just within the 5-minute window", () => {
    const sig = makeSignature(BODY, SECRET, -299); // 299 seconds ago
    expect(verifyResendWebhookSignature(BODY, sig, SECRET, NOW)).toBe(true);
  });

  it("accepts a valid signature when an earlier key candidate is invalid", () => {
    const sig = makeSignature(BODY, SECRET);
    expect(
      verifyResendWebhookSignature(
        BODY,
        { ...sig, signature: `v1,invalid v1,${sig.signature.slice("v1,".length)}` },
        SECRET,
        NOW,
      ),
    ).toBe(true);
  });
});

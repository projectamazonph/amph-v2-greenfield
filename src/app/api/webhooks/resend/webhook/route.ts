/**
 * POST /api/webhooks/resend — Resend email event webhook.
 *
 * Handles Resend delivery events: bounces, complaints, unsubscribes.
 * Currently a stub — events are logged but no business logic is triggered.
 * Extend by adding handlers in the switch below.
 *
 * Security: HMAC-SHA256 signature verification using RESEND_WEBHOOK_SECRET.
 * Every inbound request is recorded in the webhook event log before any
 * further processing, so a webhook that fails verification still leaves
 * a durable trace for replay/forensics.
 *
 * Auth header: `Resend` (Resend sends this header for all webhooks).
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { buildContainer } from "@/composition/container";
import { Result } from "@/domain/shared/Result";

const PROVIDER = "resend";
const EXPECTED_AUTH_HEADER = "Resend";

interface ResendWebhookPayload {
  type: string;
  data: {
    id: string;
    [key: string]: unknown;
  };
}

/**
 * Verify Resend webhook signature.
 * Resend signs the raw body with HMAC-SHA256 using the webhook secret.
 * The signature is sent in the `Resend-Signature` header as: t=<timestamp>,v1=<sig>
 */
function verifySignature(rawBody: string, header: string, secret: string): boolean {
  if (!header || !secret) return false;

  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  const timestamp = parts["t"];
  const signature = parts["v1"];

  if (!timestamp || !signature) return false;

  // Reject if the timestamp is too old (> 5 minutes)
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (age > 300) return false;

  const expectedSig = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");

  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text();
  const container = buildContainer();

  // ── 1. Signature verification ────────────────────────────────────
  const signatureHeader = req.headers.get("resend-signature") ?? "";
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET ?? "";
  const signatureValid = verifySignature(rawBody, signatureHeader, webhookSecret);

  // ── 2. Record the raw event ───────────────────────────────────────
  let peekType = "unknown";
  let peekId: string | undefined;
  try {
    const payload = JSON.parse(rawBody) as ResendWebhookPayload;
    if (typeof payload.type === "string") peekType = payload.type;
    if (typeof payload.data?.id === "string") peekId = payload.data.id;
  } catch {
    peekType = "invalid_json";
  }

  const recordResult = await container.webhookEventLog.record({
    provider: PROVIDER,
    eventType: peekType,
    providerEventId: peekId,
    signatureValid,
    rawPayload: rawBody,
  });
  const eventLogId = Result.isOk(recordResult) ? recordResult.value.id : undefined;

  async function finish(response: NextResponse, error?: string): Promise<NextResponse> {
    if (eventLogId) {
      await container.webhookEventLog.markProcessed(eventLogId, error);
    }
    return response;
  }

  if (!signatureValid) {
    return finish(NextResponse.json({ error: "invalid signature" }, { status: 401 }));
  }

  // ── 3. Parse and handle the event ─────────────────────────────────
  let payload: ResendWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as ResendWebhookPayload;
  } catch {
    return finish(NextResponse.json({ error: "invalid JSON" }, { status: 400 }));
  }

  // TODO (STORY-TBD): handle events when business logic is needed
  // switch (payload.type) {
  //   case "email.bounced":
  //     // mark email as bounced in user communications record
  //     break;
  //   case "email.complaint":
  //     // mark as complained, suppress further sends
  //     break;
  //   case "email.unsubscribed":
  //     // update user communication preferences
  //     break;
  //   default:
  //     // no-op for unknown event types
  // }

  return finish(NextResponse.json({ ok: true }));
}

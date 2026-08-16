/**
 * POST /api/webhooks/resend — Resend email event webhook.
 *
 * Handles Resend delivery events: bounces, complaints, unsubscribes.
 * Currently a stub — events are logged but no business logic is triggered.
 * Extend by adding handlers in the switch below.
 *
 * Security: Svix HMAC-SHA256 signature verification using RESEND_WEBHOOK_SECRET.
 * Every inbound request is recorded in the webhook event log before any
 * further processing, so a webhook that fails verification still leaves
 * a durable trace for replay/forensics.
 *
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { buildContainer } from "@/composition/container";
import { Result } from "@/domain/shared/Result";

const PROVIDER = "resend";
const SIGNATURE_TOLERANCE_SECONDS = 300;

interface ResendWebhookPayload {
  type: string;
  data: {
    email_id?: string;
    id?: string;
    [key: string]: unknown;
  };
}

/**
 * Verify Resend's Svix-signed webhook payload without parsing or changing the
 * body. The timestamp tolerance rejects stale replay attempts.
 */
export function verifyResendWebhookSignature(
  rawBody: string,
  headers: { id: string; timestamp: string; signature: string },
  secret: string,
  now = Date.now(),
): boolean {
  if (!headers.id || !headers.timestamp || !headers.signature || !secret) return false;

  const timestamp = Number(headers.timestamp);
  if (!Number.isFinite(timestamp)) return false;
  if (Math.abs(now / 1000 - timestamp) > SIGNATURE_TOLERANCE_SECONDS) return false;

  const secretPayload = secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret;
  if (!secretPayload) return false;

  const expected = createHmac("sha256", Buffer.from(secretPayload, "base64"))
    .update(`${headers.id}.${headers.timestamp}.${rawBody}`)
    .digest();

  return headers.signature.split(" ").some((candidate) => {
    const [version, signature] = candidate.split(",", 2);
    if (version !== "v1" || !signature) return false;

    const received = Buffer.from(signature, "base64");
    return received.length === expected.length && timingSafeEqual(received, expected);
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text();
  const container = buildContainer();

  // ── 1. Signature verification ────────────────────────────────────
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET ?? "";
  const signatureValid = verifyResendWebhookSignature(
    rawBody,
    {
      id: req.headers.get("svix-id") ?? "",
      timestamp: req.headers.get("svix-timestamp") ?? "",
      signature: req.headers.get("svix-signature") ?? "",
    },
    webhookSecret,
  );

  // ── 2. Record the raw event ───────────────────────────────────────
  let peekType = "unknown";
  let peekId: string | undefined;
  try {
    const payload = JSON.parse(rawBody) as ResendWebhookPayload;
    if (typeof payload.type === "string") peekType = payload.type;
    if (typeof payload.data?.email_id === "string") {
      peekId = payload.data.email_id;
    } else if (typeof payload.data?.id === "string") {
      peekId = payload.data.id;
    }
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

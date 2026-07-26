/**
 * PayMongo webhook handler — Story 021.
 *
 * Endpoint: POST /api/webhooks/paymongo
 *
 * Verifies the webhook signature, looks up the order by PayMongo session ID,
 * transitions the order to PAID, and auto-enrolls the student.
 *
 * Security: HMAC-SHA256 signature verification via the container's
 * paymentGateway (PayMongoAdapter in prod).
 * Idempotency: If the order is already PAID, returns 200 without re-processing.
 *
 * Persistence (audit hardening follow-up, docs/audit-2026-07-26-hardening-review.md):
 * every inbound request is recorded via container.webhookEventLog BEFORE any
 * business logic runs — including requests that fail signature verification
 * or aren't valid JSON — so a webhook that never reaches the order-lookup
 * step still leaves a durable trace for replay/forensics. The record is
 * then updated with the processing outcome (success or an error string) at
 * every return point.
 *
 * SOLID notes:
 * - The route uses buildContainer() for ALL data access. No
 *   `new InMemory*()` instantiations in production code (that was
 *   the Tier A bug — webhook would silently use empty in-memory
 *   repos, so order lookups 404'd and enrollments never persisted).
 * - The paymentGateway is wired through the container (so the
 *   webhook secret and signature verification are config-driven).
 * - The enrollStudent use case is dispatched via the container.
 */

import { NextRequest, NextResponse } from "next/server";
import { buildContainer } from "@/composition/container";
import { Result } from "@/domain/shared/Result";

const PROVIDER = "paymongo";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const signature = req.headers.get("paymongo-signature") ?? "";

  // Read raw body — needed for signature verification
  const rawBody = await req.text();

  // ── 1. Build the container (composition root) ────────────
  const container = buildContainer();

  // ── 2. Verify webhook signature ─────────────────────────────
  let signatureValid = true;
  try {
    // The paymentGateway's verifyWebhookSignature lives on the
    // PayMongoAdapter concrete class (it's a PayMongo-specific
    // method, not a port). We cast to access it. The container
    // is the single source of truth for the gateway instance.
    const gateway = container.paymentGateway as unknown as {
      verifyWebhookSignature(body: string, signature: string): void;
    };
    gateway.verifyWebhookSignature(rawBody, signature);
  } catch {
    signatureValid = false;
  }

  // ── 3. Persist the raw event before any further processing ──
  // Best-effort peek at the event type/id for the log entry only —
  // this does not gate any business logic below (the authoritative
  // parse happens after the signature check).
  let peekType = "unknown";
  let peekId: string | undefined;
  try {
    const peeked = JSON.parse(rawBody) as { type?: string; data?: { id?: string } };
    if (typeof peeked.type === "string") peekType = peeked.type;
    if (typeof peeked.data?.id === "string") peekId = peeked.data.id;
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
    console.error("[webhook] Invalid signature");
    return finish(
      NextResponse.json({ error: "Invalid signature" }, { status: 401 }),
      "invalid_signature",
    );
  }

  // ── 4. Parse event ──────────────────────────────────────────
  let event: { type: string; data: { id: string; attributes: Record<string, unknown> } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return finish(NextResponse.json({ error: "Invalid JSON" }, { status: 400 }), "invalid_json");
  }

  // We only care about checkout session completion events
  if (event.type !== "checkout_session.completed") {
    return finish(NextResponse.json({ received: true }));
  }

  const sessionId = event.data.id;

  // ── 5. Find the order (via the container's orderRepo) ─────
  const orderResult = await container.orderRepo.findByPaymongoPaymentId(sessionId);
  if (Result.isErr(orderResult)) {
    console.error(`[webhook] Order not found for session: ${sessionId}`);
    return finish(
      NextResponse.json({ error: "Order not found" }, { status: 404 }),
      "order_not_found",
    );
  }
  const order = orderResult.value;

  // ── 6. Idempotency: no-op if already paid ──────────────────
  if (order.isPaid()) {
    return finish(NextResponse.json({ received: true }));
  }

  // ── 7. Mark order as paid (via the container's orderRepo) ──
  try {
    order.markPaid();
    await container.orderRepo.update(order);
  } catch (err) {
    console.error(`[webhook] Failed to mark order ${order.id} as paid:`, err);
    return finish(
      NextResponse.json({ error: "Failed to update order" }, { status: 500 }),
      `failed_to_update_order: ${String(err)}`,
    );
  }

  // ── 8. Auto-enroll the student (via the container's use case) ─
  let enrollError: string | undefined;
  try {
    const enrollResult = await container.enrollStudent.execute({
      userId: order.userId,
      courseId: order.courseId,
      // P0-1: webhook only fires after a successful payment, so we have
      // an authoritative paid order on file. Use "order" entitlement.
      entitlement: "order",
    });
    if (Result.isErr(enrollResult)) {
      console.warn(`[webhook] Enrollment failed for order ${order.id}:`, enrollResult.error);
      // Non-fatal — order is already marked paid. Enrollment can be retried.
      enrollError = `enrollment_failed: ${JSON.stringify(enrollResult.error)}`;
    }
  } catch (err) {
    console.error(`[webhook] Enrollment error for order ${order.id}:`, err);
    enrollError = `enrollment_threw: ${String(err)}`;
  }

  return finish(NextResponse.json({ received: true }), enrollError);
}

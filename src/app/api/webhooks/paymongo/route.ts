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

export async function POST(req: NextRequest): Promise<NextResponse> {
  const signature = req.headers.get("paymongo-signature") ?? "";

  // Read raw body — needed for signature verification
  const rawBody = await req.text();

  // ── 1. Build the container (composition root) ────────────
  const container = buildContainer();

  // ── 2. Verify webhook signature ─────────────────────────────
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
    console.error("[webhook] Invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // ── 3. Parse event ──────────────────────────────────────────
  let event: { type: string; data: { id: string; attributes: Record<string, unknown> } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // We only care about checkout session completion events
  if (event.type !== "checkout_session.completed") {
    return NextResponse.json({ received: true });
  }

  const sessionId = event.data.id;

  // ── 4. Find the order (via the container's orderRepo) ─────
  const orderResult = await container.orderRepo.findByPaymongoPaymentId(sessionId);
  if (Result.isErr(orderResult)) {
    console.error(`[webhook] Order not found for session: ${sessionId}`);
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  const order = orderResult.value;

  // ── 5. Idempotency: no-op if already paid ──────────────────
  if (order.isPaid()) {
    return NextResponse.json({ received: true });
  }

  // ── 6. Mark order as paid (via the container's orderRepo) ──
  try {
    order.markPaid();
    await container.orderRepo.update(order);
  } catch (err) {
    console.error(`[webhook] Failed to mark order ${order.id} as paid:`, err);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }

  // ── 7. Auto-enroll the student (via the container's use case) ─
  try {
    const enrollResult = await container.enrollStudent.execute({
      userId: order.userId,
      courseId: order.courseId,
    });
    if (Result.isErr(enrollResult)) {
      console.warn(
        `[webhook] Enrollment failed for order ${order.id}:`,
        enrollResult.error,
      );
      // Non-fatal — order is already marked paid. Enrollment can be retried.
    }
  } catch (err) {
    console.error(`[webhook] Enrollment error for order ${order.id}:`, err);
  }

  return NextResponse.json({ received: true });
}

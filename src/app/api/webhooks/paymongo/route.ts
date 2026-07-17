/**
 * PayMongo webhook handler — Story 021.
 *
 * Endpoint: POST /api/webhooks/paymongo
 *
 * Verifies the webhook signature, looks up the order by PayMongo session ID,
 * transitions the order to PAID, and auto-enrolls the student.
 *
 * Security: HMAC-SHA256 signature verification via PayMongoAdapter.
 * Idempotency: If the order is already PAID, returns 200 without re-processing.
 */

import { NextRequest, NextResponse } from "next/server";
import { PayMongoAdapter } from "@/infra/payment/PayMongoAdapter";
import { InMemoryOrderRepository } from "@/infra/payment/InMemoryOrderRepository";
import { InMemoryCourseRepository } from "@/infra/repositories/InMemoryCourseRepository";
import { Result } from "@/domain/shared/Result";
import { EnrollStudent } from "@/usecases/EnrollStudent";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const signature = req.headers.get("paymongo-signature") ?? "";

  // Read raw body — needed for signature verification
  const rawBody = await req.text();

  // ── 1. Verify webhook signature ─────────────────────────────
  const paymongo = new PayMongoAdapter(
    process.env.PAYMONGO_SECRET ?? "",
    process.env.PAYMONGO_WEBHOOK_SECRET,
  );

  try {
    paymongo.verifyWebhookSignature(rawBody, signature);
  } catch {
    console.error("[webhook] Invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // ── 2. Parse event ──────────────────────────────────────────
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

  // ── 3. Wire dependencies ────────────────────────────────────
  // In production, these come from the DI container.
  // For the webhook (edge runtime), we instantiate directly.
  // Wire up PrismaOrderRepository in composition/container.ts for the full app.
  const orderRepo = new InMemoryOrderRepository();
  const courseRepo = new InMemoryCourseRepository();
  const enrollStudent = new EnrollStudent(courseRepo, () => crypto.randomUUID());

  // ── 4. Find the order ──────────────────────────────────────
  const orderResult = await orderRepo.findByPaymongoPaymentId(sessionId);
  if (Result.isErr(orderResult)) {
    console.error(`[webhook] Order not found for session: ${sessionId}`);
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  const order = orderResult.value;

  // ── 5. Idempotency: no-op if already paid ──────────────────
  if (order.isPaid()) {
    return NextResponse.json({ received: true });
  }

  // ── 6. Mark order as paid ──────────────────────────────────
  try {
    order.markPaid();
    await orderRepo.update(order);
  } catch (err) {
    console.error(`[webhook] Failed to mark order ${order.id} as paid:`, err);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }

  // ── 7. Auto-enroll the student ─────────────────────────────
  try {
    const enrollResult = await enrollStudent.execute(order.userId, order.courseId);
    if (!enrollResult.ok) {
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

import { describe, it, expect, beforeEach } from "vitest";
import { Order } from "@/domain/entities/Order";
import { Result } from "@/domain/shared/Result";
import { InMemoryOrderRepository } from "@/infra/payment/InMemoryOrderRepository";
import { StubPaymentGateway } from "@/infra/payment/StubPaymentGateway";

// ── Webhook handler logic (extracted so it can be unit-tested without HTTP) ──

type WebhookDeps = {
  orderRepo: InMemoryOrderRepository;
  paymentGateway: StubPaymentGateway;
};

async function processWebhookEvent(
  deps: WebhookDeps,
  event: { type: string; data: { id: string; attributes: Record<string, unknown> } },
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const sessionId = event.data.id;

  // Find order by PayMongo session ID
  const orderResult = await deps.orderRepo.findByPaymongoPaymentId(sessionId);
  if (Result.isErr(orderResult)) {
    return { ok: false, status: 404, error: "Order not found" };
  }
  const order = orderResult.value;

  // Only handle completed checkout sessions
  if (event.type !== "checkout_session.completed") {
    return { ok: true };
  }

  // Idempotency: no-op if already paid
  if (order.isPaid()) {
    return { ok: true };
  }

  // Mark order paid
  order.markPaid();
  await deps.orderRepo.update(order);

  return { ok: true };
}

// ── Tests ───────────────────────────────────────────────────────

describe("processWebhookEvent", () => {
  let orderRepo: InMemoryOrderRepository;
  let paymentGateway: StubPaymentGateway;

  function makeDeps(): WebhookDeps {
    return { orderRepo, paymentGateway };
  }

  beforeEach(() => {
    orderRepo = new InMemoryOrderRepository();
    paymentGateway = new StubPaymentGateway();
  });

  function seedPendingOrder(overrides: {
    id?: string;
    userId?: string;
    courseId?: string;
    paymongoPaymentId?: string;
  } = {}) {
    const order = Order.create({
      id: overrides.id ?? "order_01",
      userId: overrides.userId ?? "user_01",
      courseId: overrides.courseId ?? "course_01",
      subtotalMinor: 299900,
      discountMinor: 0,
      totalMinor: 299900,
      currency: "PHP",
    });
    order.markPending(
      overrides.paymongoPaymentId ?? "cs_abc",
      "https://checkout.paymongo.com/cs_abc",
    );
    orderRepo.orders.set(order.id, order);
  }

  async function getOrder(id: string) {
    const r = await orderRepo.findById(id);
    if (!r.ok) throw new Error("Order not found");
    return r.value;
  }

  // ── happy path ─────────────────────────────────────────────

  it("marks order paid on checkout_session.completed", async () => {
    seedPendingOrder();

    const result = await processWebhookEvent(makeDeps(), {
      type: "checkout_session.completed",
      data: { id: "cs_abc", attributes: {} },
    });

    expect(result).toEqual({ ok: true });

    const updated = await getOrder("order_01");
    expect(updated.isPaid()).toBe(true);
    expect(updated.paymongoStatus).toBe("paid");
  });

  it("sets paymongoPaidAt when marking paid", async () => {
    seedPendingOrder();

    await processWebhookEvent(makeDeps(), {
      type: "checkout_session.completed",
      data: { id: "cs_abc", attributes: {} },
    });

    const updated = await getOrder("order_01");
    expect(updated.paymongoPaidAt).toBeInstanceOf(Date);
  });

  it("persists the updated order", async () => {
    seedPendingOrder();

    await processWebhookEvent(makeDeps(), {
      type: "checkout_session.completed",
      data: { id: "cs_abc", attributes: {} },
    });

    // Re-fetch from repo (tests update was actually called)
    const fresh = await getOrder("order_01");
    expect(fresh.isPaid()).toBe(true);
  });

  // ── error cases ────────────────────────────────────────────

  it("returns 404 if no order found for session ID", async () => {
    const result = await processWebhookEvent(makeDeps(), {
      type: "checkout_session.completed",
      data: { id: "cs_nonexistent", attributes: {} },
    });

    expect(result).toEqual({ ok: false, status: 404, error: "Order not found" });
  });

  // ── non-completed events ────────────────────────────────────

  it("ignores payment.paid event (not a checkout session event)", async () => {
    seedPendingOrder();

    const result = await processWebhookEvent(makeDeps(), {
      type: "payment.paid",
      data: { id: "cs_abc", attributes: {} },
    });

    expect(result).toEqual({ ok: true });
    const updated = await getOrder("order_01");
    expect(updated.status).toBe("PENDING");
  });

  it("ignores unknown event types", async () => {
    seedPendingOrder();

    await processWebhookEvent(makeDeps(), {
      type: "order.updated",
      data: { id: "cs_abc", attributes: {} },
    });

    const updated = await getOrder("order_01");
    expect(updated.status).toBe("PENDING");
  });

  // ── idempotency ───────────────────────────────────────────

  it("is idempotent: no-op if order already PAID", async () => {
    // Seed an already-paid order
    await orderRepo.seedPaidOrder({
      id: "order_01",
      userId: "user_01",
      courseId: "course_01",
      totalMinor: 299900,
      paymongoPaymentId: "cs_abc",
    });

    // Webhook arrives again
    const result = await processWebhookEvent(makeDeps(), {
      type: "checkout_session.completed",
      data: { id: "cs_abc", attributes: {} },
    });

    expect(result).toEqual({ ok: true }); // still ok, no error
  });
});

// ── Signature verification ──────────────────────────────────────

describe("StubPaymentGateway.verifyWebhookSignature", () => {
  // The stub always passes — real signature verification is tested in
  // PayMongoAdapter's own unit tests with the real HMAC implementation.
  it("always passes (stub behavior — real verification tested in PayMongoAdapter tests)", () => {
    const adapter = new StubPaymentGateway();
    expect(() => adapter.verifyWebhookSignature("{}", "")).not.toThrow();
    expect(() => adapter.verifyWebhookSignature("{}", "t=123,v1=abc")).not.toThrow();
  });
});

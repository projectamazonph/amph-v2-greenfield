/**
 * route.persistence.test.ts — audit hardening follow-up.
 *
 * Exercises the real POST handler (mocking @/composition/container,
 * mirroring src/app/api/auth/__tests__/signup.test.ts's pattern) to pin
 * the contract that every inbound webhook is persisted via
 * container.webhookEventLog, regardless of how it's handled downstream.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { InMemoryWebhookEventLog } from "@/infra/repositories/InMemoryWebhookEventLog";
import { InMemoryOrderRepository } from "@/infra/payment/InMemoryOrderRepository";
import { Order } from "@/domain/entities/Order";
import { Result } from "@/domain/shared/Result";

let signatureShouldFail = false;
let webhookEventLog: InMemoryWebhookEventLog;
let orderRepo: InMemoryOrderRepository;
let enrollStudentExecute: ReturnType<typeof vi.fn>;

function seedPendingOrder(paymongoPaymentId: string) {
  const order = Order.create({
    id: "order_01",
    userId: "user_01",
    courseId: "course_01",
    subtotalMinor: 299900,
    discountMinor: 0,
    totalMinor: 299900,
    currency: "PHP",
  });
  const r = order.markPending(
    paymongoPaymentId,
    `https://checkout.paymongo.com/${paymongoPaymentId}`,
  );
  expect(r.ok).toBe(true);
  orderRepo.orders.set(order.id, order);
}

vi.mock("@/composition/container", () => ({
  buildContainer: () => ({
    paymentGateway: {
      verifyWebhookSignature: (_body: string, _sig: string) => {
        if (signatureShouldFail) return Result.err({ kind: "signature_mismatch" });
        return Result.ok(true);
      },
    },
    orderRepo,
    webhookEventLog,
    enrollStudent: { execute: enrollStudentExecute },
  }),
}));

import { POST } from "@/app/api/webhooks/paymongo/route";

function makeRequest(body: string, signature = "t=1,v1=valid"): Request {
  return new Request("http://localhost/api/webhooks/paymongo", {
    method: "POST",
    headers: { "paymongo-signature": signature },
    body,
  });
}

describe("POST /api/webhooks/paymongo — persistence", () => {
  beforeEach(() => {
    signatureShouldFail = false;
    webhookEventLog = new InMemoryWebhookEventLog();
    orderRepo = new InMemoryOrderRepository();
    enrollStudentExecute = vi.fn(async () => Result.ok(undefined));
  });

  it("persists a record with signatureValid=false and processingError=invalid_signature on bad signature", async () => {
    signatureShouldFail = true;
    const res = await POST(
      makeRequest('{"type":"checkout_session.completed","data":{"id":"cs_x"}}') as never,
    );

    expect(res.status).toBe(401);
    const entries = webhookEventLog.getAll();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.signatureValid).toBe(false);
    expect(entries[0]?.processingError).toBe("invalid_signature");
    expect(entries[0]?.processedAt).toBeInstanceOf(Date);
  });

  it("persists a record even when the body isn't valid JSON", async () => {
    const res = await POST(makeRequest("not json at all") as never);

    expect(res.status).toBe(400);
    const entries = webhookEventLog.getAll();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.eventType).toBe("invalid_json");
    expect(entries[0]?.processingError).toBe("invalid_json");
  });

  it("persists a record with processingError=order_not_found when no matching order exists", async () => {
    const res = await POST(
      makeRequest('{"type":"checkout_session.completed","data":{"id":"cs_missing"}}') as never,
    );

    expect(res.status).toBe(404);
    const entries = webhookEventLog.getAll();
    expect(entries[0]?.processingError).toBe("order_not_found");
    expect(entries[0]?.providerEventId).toBe("cs_missing");
  });

  it("persists a record with no processingError on the happy path", async () => {
    seedPendingOrder("cs_abc");
    const res = await POST(
      makeRequest('{"type":"checkout_session.completed","data":{"id":"cs_abc"}}') as never,
    );

    expect(res.status).toBe(200);
    const entries = webhookEventLog.getAll();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.signatureValid).toBe(true);
    expect(entries[0]?.eventType).toBe("checkout_session.completed");
    expect(entries[0]?.processingError).toBeNull();
    expect(entries[0]?.processedAt).toBeInstanceOf(Date);
    expect(enrollStudentExecute).toHaveBeenCalledWith({
      userId: "user_01",
      courseId: "course_01",
      entitlement: "order",
    });
  });

  it("fulfills a current PayMongo checkout-session payment event", async () => {
    seedPendingOrder("cs_current");
    const body = JSON.stringify({
      data: {
        id: "evt_current",
        type: "event",
        attributes: {
          type: "checkout_session.payment.paid",
          data: { id: "cs_current", type: "checkout_session", attributes: {} },
        },
      },
    });

    const res = await POST(makeRequest(body) as never);

    expect(res.status).toBe(200);
    const order = orderRepo.orders.get("order_01");
    expect(order?.status).toBe("PAID");
    const entries = webhookEventLog.getAll();
    expect(entries[0]?.eventType).toBe("checkout_session.payment.paid");
    expect(entries[0]?.providerEventId).toBe("evt_current");
  });

  it("persists a record with no processingError for idempotent replays (already-paid order)", async () => {
    seedPendingOrder("cs_paid");
    const order = orderRepo.orders.get("order_01");
    expect(order?.markPaid().ok).toBe(true);

    const res = await POST(
      makeRequest('{"type":"checkout_session.completed","data":{"id":"cs_paid"}}') as never,
    );

    expect(res.status).toBe(200);
    const entries = webhookEventLog.getAll();
    expect(entries[0]?.processingError).toBeNull();
    expect(enrollStudentExecute).not.toHaveBeenCalled();
  });

  it("persists a record with no processingError for non-checkout events (ignored, not an error)", async () => {
    const res = await POST(
      makeRequest('{"type":"payment.paid","data":{"id":"cs_whatever"}}') as never,
    );

    expect(res.status).toBe(200);
    const entries = webhookEventLog.getAll();
    expect(entries[0]?.eventType).toBe("payment.paid");
    expect(entries[0]?.processingError).toBeNull();
  });
});

/**
 * ProcessRefund.test.ts — STORY-049.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ProcessRefund } from "@/usecases/ProcessRefund";
import { InMemoryOrderRepository } from "@/infra/payment/InMemoryOrderRepository";
import { StubPaymentGateway } from "@/infra/payment/StubPaymentGateway";
import { FixedClock, SystemClock } from "@/ports/system/Clock";

describe("ProcessRefund", () => {
  let orderRepo: InMemoryOrderRepository;
  let paymentGateway: StubPaymentGateway;
  let useCase: ProcessRefund;

  beforeEach(() => {
    orderRepo = new InMemoryOrderRepository();
    paymentGateway = new StubPaymentGateway();
    // Use SystemClock so the seed's `new Date()` (which sets paymongoPaidAt)
    // matches the clock's "now". The window test overrides to a future date.
    useCase = new ProcessRefund({
      orderRepo,
      paymentGateway,
      clock: new SystemClock(),
    });
  });

  it("processes a full refund on the happy path", async () => {
    await orderRepo.seedPaidOrder({
      id: "o1",
      userId: "u1",
      courseId: "c1",
      totalMinor: 1000,
      paymongoPaymentId: "cs_paid_1",
    });

    const r = await useCase.execute({
      orderId: "o1",
      amountMinor: 1000,
      reason: "Customer requested",
    });

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.order.status).toBe("REFUNDED");
    expect(r.value.refundId).toMatch(/^re_test_/);

    expect(paymentGateway.refundCalls).toHaveLength(1);
    expect(paymentGateway.refundCalls[0]).toEqual({
      paymongoPaymentId: "cs_paid_1",
      amountMinor: 1000,
      reason: "Customer requested",
    });
  });

  it("returns order_not_found when the order doesn't exist", async () => {
    const r = await useCase.execute({
      orderId: "missing",
      amountMinor: 100,
      reason: "x",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("order_not_found");
  });

  it("returns not_paid when the order is PENDING", async () => {
    await orderRepo.seedPendingOrder({
      id: "o1",
      userId: "u1",
      courseId: "c1",
      paymongoPaymentId: "cs_p",
      paymongoCheckoutUrl: "http://x",
    });

    const r = await useCase.execute({
      orderId: "o1",
      amountMinor: 100,
      reason: "x",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("not_paid");
  });

  it("returns not_paid when the order is FAILED", async () => {
    await orderRepo.seedFailedOrder({
      id: "o1",
      userId: "u1",
      courseId: "c1",
    });

    const r = await useCase.execute({
      orderId: "o1",
      amountMinor: 100,
      reason: "x",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("not_paid");
  });

  it("returns invalid_amount for zero or negative amount", async () => {
    await orderRepo.seedPaidOrder({
      id: "o1",
      userId: "u1",
      courseId: "c1",
      totalMinor: 1000,
      paymongoPaymentId: "cs_paid_1",
    });

    const r = await useCase.execute({
      orderId: "o1",
      amountMinor: 0,
      reason: "x",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("invalid_amount");
  });

  it("returns amount_exceeds_total when amount > total", async () => {
    await orderRepo.seedPaidOrder({
      id: "o1",
      userId: "u1",
      courseId: "c1",
      totalMinor: 1000,
      paymongoPaymentId: "cs_paid_1",
    });

    const r = await useCase.execute({
      orderId: "o1",
      amountMinor: 2000,
      reason: "x",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("amount_exceeds_total");
  });

  it("returns outside_refund_window when paid > 30 days ago", async () => {
    await orderRepo.seedPaidOrder({
      id: "o1",
      userId: "u1",
      courseId: "c1",
      totalMinor: 1000,
      paymongoPaymentId: "cs_paid_1",
    });
    // The seed marks paid at `new Date()` (now). Use a fixed clock 31 days later.
    useCase = new ProcessRefund({
      orderRepo,
      paymentGateway,
      clock: new FixedClock(new Date(Date.now() + 31 * 24 * 60 * 60 * 1000)),
    });

    const r = await useCase.execute({
      orderId: "o1",
      amountMinor: 1000,
      reason: "x",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("outside_refund_window");
  });

  it("returns refund_failed when the gateway errors", async () => {
    await orderRepo.seedPaidOrder({
      id: "o1",
      userId: "u1",
      courseId: "c1",
      totalMinor: 1000,
      paymongoPaymentId: "cs_paid_1",
    });
    paymentGateway.refundShouldFail = {
      kind: "network_error",
      message: "PayMongo down",
    };

    const r = await useCase.execute({
      orderId: "o1",
      amountMinor: 1000,
      reason: "x",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("refund_failed");
  });

  it("returns already_refunded when called twice on the same order", async () => {
    await orderRepo.seedPaidOrder({
      id: "o1",
      userId: "u1",
      courseId: "c1",
      totalMinor: 1000,
      paymongoPaymentId: "cs_paid_1",
    });

    await useCase.execute({ orderId: "o1", amountMinor: 1000, reason: "x" });
    const r = await useCase.execute({ orderId: "o1", amountMinor: 1000, reason: "y" });

    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("already_refunded");
  });

  it("persists the REFUNDED state", async () => {
    await orderRepo.seedPaidOrder({
      id: "o1",
      userId: "u1",
      courseId: "c1",
      totalMinor: 1000,
      paymongoPaymentId: "cs_paid_1",
    });

    await useCase.execute({ orderId: "o1", amountMinor: 1000, reason: "x" });

    const persisted = await orderRepo.findById("o1");
    expect(persisted.ok).toBe(true);
    if (!persisted.ok) return;
    expect(persisted.value.status).toBe("REFUNDED");
    expect(persisted.value.refundAmountMinor).toBe(1000);
    expect(persisted.value.refundReason).toBe("x");
  });
});

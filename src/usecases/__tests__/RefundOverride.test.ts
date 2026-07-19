/**
 * RefundOverride.test.ts — STORY-049.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { RefundOverride } from "@/usecases/RefundOverride";
import { InMemoryOrderRepository } from "@/infra/payment/InMemoryOrderRepository";
import { StubPaymentGateway } from "@/infra/payment/StubPaymentGateway";
import { SystemClock } from "@/ports/system/Clock";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";

describe("RefundOverride", () => {
  let orderRepo: InMemoryOrderRepository;
  let paymentGateway: StubPaymentGateway;
  let useCase: RefundOverride;

  beforeEach(() => {
    orderRepo = new InMemoryOrderRepository();
    paymentGateway = new StubPaymentGateway();
    const auditLog = new InMemoryAuditLog();
    const recordAuditLog = new RecordAuditLog({ auditLog, idGen: { newId: () => `ale_${Date.now()}`, paymentRef: () => "x", receiptNumber: () => "x" }, clock: new SystemClock() });
    useCase = new RefundOverride({ orderRepo, paymentGateway, recordAuditLog });
    // Ensure clock exists (used by ProcessRefund, not RefundOverride — for type compat only)
    void new SystemClock();
  });

  it("processes a refund on the happy path", async () => {
    await orderRepo.seedPaidOrder({
      id: "o1",
      userId: "u1",
      courseId: "c1",
      totalMinor: 1000,
      paymongoPaymentId: "cs_paid_1",
    });

    const r = await useCase.execute({
      orderId: "o1",
      actorId: "admin_1",
      amountMinor: 1000,
      reason: "Goodwill",
      overrideReason: "Customer escalated; support approved",
    });

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.order.status).toBe("REFUNDED");
    expect(r.value.refundId).toMatch(/^re_test_/);
  });

  it("bypasses the 30-day window", async () => {
    // Seed a paid order (paidAt = now), but use a use case with a clock 31 days out.
    // We don't have a clock on RefundOverride, but the order's paymongoPaidAt is
    // `new Date()` from the seed, so this test verifies the behavior indirectly:
    // ProcessRefund would fail with `outside_refund_window` here, but RefundOverride
    // succeeds.
    await orderRepo.seedPaidOrder({
      id: "o1",
      userId: "u1",
      courseId: "c1",
      totalMinor: 1000,
      paymongoPaymentId: "cs_paid_1",
    });

    // Force a stale paidAt
    const order = (await orderRepo.findById("o1")) as { ok: true; value: { paymongoPaidAt: Date | null; markPaid: (d: Date) => void; paymongoStatus: string | null; status: string } };
    if (order.ok) {
      order.value.paymongoPaidAt = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    }

    const r = await useCase.execute({
      orderId: "o1",
      actorId: "admin_1",
      amountMinor: 1000,
      reason: "Goodwill",
      overrideReason: "Old order, customer dispute",
    });

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.order.status).toBe("REFUNDED");
  });

  it("stores the override reason in the audit trail", async () => {
    await orderRepo.seedPaidOrder({
      id: "o1",
      userId: "u1",
      courseId: "c1",
      totalMinor: 1000,
      paymongoPaymentId: "cs_paid_1",
    });

    await useCase.execute({
      orderId: "o1",
      actorId: "admin_1",
      amountMinor: 1000,
      reason: "Goodwill",
      overrideReason: "Customer escalated",
    });

    const persisted = await orderRepo.findById("o1");
    expect(persisted.ok).toBe(true);
    if (!persisted.ok) return;
    expect(persisted.value.refundReason).toContain("[OVERRIDE: Customer escalated]");
    expect(persisted.value.refundReason).toContain("Goodwill");
  });

  it("returns missing_override_reason when overrideReason is empty", async () => {
    await orderRepo.seedPaidOrder({
      id: "o1",
      userId: "u1",
      courseId: "c1",
      totalMinor: 1000,
      paymongoPaymentId: "cs_paid_1",
    });

    const r = await useCase.execute({
      orderId: "o1",
      actorId: "admin_1",
      amountMinor: 1000,
      reason: "x",
      overrideReason: "   ",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("missing_override_reason");
  });

  it("returns order_not_found when the order doesn't exist", async () => {
    const r = await useCase.execute({
      orderId: "missing",
      actorId: "admin_1",
      amountMinor: 100,
      reason: "x",
      overrideReason: "y",
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
      actorId: "admin_1",
      amountMinor: 100,
      reason: "x",
      overrideReason: "y",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("not_paid");
  });

  it("returns already_refunded when called twice on the same order", async () => {
    await orderRepo.seedPaidOrder({
      id: "o1",
      userId: "u1",
      courseId: "c1",
      totalMinor: 1000,
      paymongoPaymentId: "cs_paid_1",
    });

    await useCase.execute({
      orderId: "o1",
      actorId: "admin_1",
      amountMinor: 1000,
      reason: "x",
      overrideReason: "y",
    });
    const r = await useCase.execute({
      orderId: "o1",
      actorId: "admin_1",
      amountMinor: 1000,
      reason: "x",
      overrideReason: "y",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("already_refunded");
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
      actorId: "admin_1",
      amountMinor: 2000,
      reason: "x",
      overrideReason: "y",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("amount_exceeds_total");
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
      actorId: "admin_1",
      amountMinor: 1000,
      reason: "x",
      overrideReason: "y",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("refund_failed");
  });
});

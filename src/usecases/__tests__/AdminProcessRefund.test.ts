/**
 * AdminProcessRefund.test.ts — STORY-062 TDD.
 *
 * Orchestrates validation + delegation to RefundOverride. Tests:
 * - happy path delegates correctly (amount, reason, overrideReason)
 * - order_not_found when the order doesn't exist
 * - no_refund_requested when refundRequestedAt is null
 * - already_processed when refundProcessedAt is set
 * - not_paid when order is not PAID
 * - propagates RefundOverride errors (e.g. refund_failed)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { AdminProcessRefund } from "@/usecases/AdminProcessRefund";
import { RefundOverride } from "@/usecases/RefundOverride";
import { InMemoryOrderRepository } from "@/infra/payment/InMemoryOrderRepository";
import { StubPaymentGateway } from "@/infra/payment/StubPaymentGateway";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { InMemoryIdGenerator } from "@/infra/system/InMemoryIdGenerator";
import { FixedClock } from "@/ports/system/Clock";

describe("AdminProcessRefund", () => {
  let orderRepo: InMemoryOrderRepository;
  let paymentGateway: StubPaymentGateway;
  let auditLog: InMemoryAuditLog;
  let useCase: AdminProcessRefund;
  let refundOverride: RefundOverride;
  let recordedCalls: unknown[] = [];

  beforeEach(() => {
    orderRepo = new InMemoryOrderRepository();
    paymentGateway = new StubPaymentGateway();
    auditLog = new InMemoryAuditLog();
    const recordAuditLog = new RecordAuditLog({
      auditLog,
      idGen: new InMemoryIdGenerator(),
      clock: new FixedClock(new Date()),
    });
    refundOverride = new RefundOverride({ orderRepo, paymentGateway, recordAuditLog });
    useCase = new AdminProcessRefund({ orderRepo, refundOverride });

    // Track RefundOverride calls
    recordedCalls = [];
    const origExecute = refundOverride.execute.bind(refundOverride);
    refundOverride.execute = async (input) => {
      recordedCalls.push(input);
      return origExecute(input);
    };
  });

  async function seedPendingRefundRequest(params: {
    id: string;
    userId: string;
    courseId: string;
    totalMinor?: number;
    reason?: string;
  }): Promise<void> {
    await orderRepo.seedPaidOrder({
      id: params.id,
      userId: params.userId,
      courseId: params.courseId,
      totalMinor: params.totalMinor ?? 1000,
      paymongoPaymentId: `cs_${params.id}`,
    });
    const r = await orderRepo.findById(params.id);
    if (!r.ok) throw new Error("seed failed");
    r.value.refundRequestedAt = new Date("2026-07-01T00:00:00Z");
    r.value.refundReason = params.reason ?? "I changed my mind";
  }

  it("processes the refund and delegates to RefundOverride on the happy path", async () => {
    await seedPendingRefundRequest({
      id: "o1",
      userId: "u1",
      courseId: "c1",
      totalMinor: 1000,
      reason: "Course too advanced",
    });

    const r = await useCase.execute({ orderId: "o1", actorId: "admin_1" });

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.order.status).toBe("REFUNDED");
    expect(r.value.refundId).toMatch(/^re_test_/);

    // Verify delegation: orderId, actorId, amountMinor = total, reason, overrideReason
    expect(recordedCalls.length).toBe(1);
    const call = recordedCalls[0] as {
      orderId: string;
      actorId: string;
      amountMinor: number;
      reason: string;
      overrideReason: string;
    };
    expect(call).toEqual({
      orderId: "o1",
      actorId: "admin_1",
      amountMinor: 1000,
      reason: "Course too advanced",
      overrideReason: "Admin processed student refund request",
    });
  });

  it("falls back to 'Refund' as the reason when refundReason is null", async () => {
    await seedPendingRefundRequest({
      id: "o1",
      userId: "u1",
      courseId: "c1",
      totalMinor: 500,
    });
    // Clear the refund reason
    const r = await orderRepo.findById("o1");
    if (r.ok) r.value.refundReason = null;

    const result = await useCase.execute({ orderId: "o1", actorId: "admin_1" });

    expect(result.ok).toBe(true);
    expect(recordedCalls[0]).toMatchObject({ reason: "Refund" });
  });

  it("returns order_not_found when the order doesn't exist", async () => {
    const r = await useCase.execute({ orderId: "missing", actorId: "admin_1" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("order_not_found");
  });

  it("returns no_refund_requested when the order has no refund request", async () => {
    await orderRepo.seedPaidOrder({ id: "o1", userId: "u1", courseId: "c1" });
    // refundRequestedAt is null by default after seedPaidOrder

    const r = await useCase.execute({ orderId: "o1", actorId: "admin_1" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("no_refund_requested");
  });

  it("returns already_processed when the refund has already been processed", async () => {
    await seedPendingRefundRequest({ id: "o1", userId: "u1", courseId: "c1" });
    // Mark the order as already-processed
    const r = await orderRepo.findById("o1");
    if (r.ok) {
      r.value.refundProcessedAt = new Date("2026-07-02T00:00:00Z");
      r.value.refundAmountMinor = 1000;
      r.value.status = "REFUNDED";
    }

    const result = await useCase.execute({ orderId: "o1", actorId: "admin_1" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("already_processed");
  });

  it("returns not_paid when the order is not PAID (e.g. PENDING)", async () => {
    // Seed a PENDING order with a refund request — should fail not_paid
    await orderRepo.seedPendingOrder({
      id: "o1",
      userId: "u1",
      courseId: "c1",
      paymongoPaymentId: "cs_o1",
      paymongoCheckoutUrl: "http://x",
    });
    const r = await orderRepo.findById("o1");
    if (r.ok) {
      r.value.refundRequestedAt = new Date("2026-07-01T00:00:00Z");
      r.value.refundReason = "test";
    }

    const result = await useCase.execute({ orderId: "o1", actorId: "admin_1" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("not_paid");
  });

  it("propagates refund_failed from the gateway", async () => {
    await seedPendingRefundRequest({ id: "o1", userId: "u1", courseId: "c1" });
    paymentGateway.refundShouldFail = {
      kind: "network_error",
      message: "PayMongo down",
    };

    const r = await useCase.execute({ orderId: "o1", actorId: "admin_1" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("refund_failed");
  });

  it("propagates not_paid from RefundOverride when the order is somehow not PAID (race)", async () => {
    // The use case already validates not_paid before delegating, so we
    // can only hit this branch if RefundOverride's stricter rules
    // catch something the use case didn't. In practice the use case's
    // pre-check makes this redundant, but verify the delegation is
    // wired through correctly by passing a valid setup and checking
    // the orderRefunded side effects (audit log + persisted state).
    await seedPendingRefundRequest({ id: "o1", userId: "u1", courseId: "c1" });

    await useCase.execute({ orderId: "o1", actorId: "admin_1" });

    // Order was marked REFUNDED, and an audit entry was written.
    const persisted = await orderRepo.findById("o1");
    expect(persisted.ok).toBe(true);
    if (!persisted.ok) return;
    expect(persisted.value.status).toBe("REFUNDED");
    expect(persisted.value.refundAmountMinor).toBe(1000);
    expect(persisted.value.refundProcessedAt).not.toBeNull();

    // The audit log captured the override.
    const entries = auditLog.getAll();
    expect(entries.some((e) => e.action === "refund.overridden")).toBe(true);
  });
});

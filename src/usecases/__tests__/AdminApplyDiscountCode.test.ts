/**
 * AdminApplyDiscountCode.test.ts — STORY-024/050d.
 *
 * Verifies the operator-only path through which a discount code reaches
 * a PAID order. The learner-facing checkout has no coupon field and
 * never calls this use case.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { AdminApplyDiscountCode } from "@/usecases/AdminApplyDiscountCode";
import { InMemoryOrderRepository } from "@/infra/payment/InMemoryOrderRepository";
import { InMemoryDiscountCodeRepository } from "@/infra/repositories/InMemoryDiscountCodeRepository";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { InMemoryIdGenerator } from "@/infra/system/InMemoryIdGenerator";
import { SystemClock } from "@/ports/system/Clock";
import { createDiscountCode } from "@/domain/entities/DiscountCode";
import { TestLogger } from "@/infra/observability/TestLogger";

const ADMIN_ID = "admin-1";

describe("AdminApplyDiscountCode", () => {
  let orderRepo: InMemoryOrderRepository;
  let discountCodeRepo: InMemoryDiscountCodeRepository;
  let auditLog: InMemoryAuditLog;
  let useCase: AdminApplyDiscountCode;

  beforeEach(() => {
    orderRepo = new InMemoryOrderRepository();
    discountCodeRepo = new InMemoryDiscountCodeRepository();
    auditLog = new InMemoryAuditLog();
    useCase = new AdminApplyDiscountCode({
      orderRepo,
      discountCodeRepo,
      clock: new SystemClock(),
      recordAuditLog: new RecordAuditLog({
        auditLog,
        idGen: new InMemoryIdGenerator(),
        clock: new SystemClock(),
        logger: new TestLogger(),
      }),
      logger: new TestLogger(),
    });
  });

  async function seedPaidOrder(params: { id: string; totalMinor: number; discountMinor?: number }) {
    await orderRepo.seedPaidOrder({
      id: params.id,
      userId: "u1",
      courseId: "c1",
      totalMinor: params.totalMinor,
      paymongoPaymentId: "cs_paid_1",
    });
    if (params.discountMinor && params.discountMinor > 0) {
      // Refuse to overwrite; just patch the field directly through the
      // repository's stored representation. This keeps the seed honest
      // because the use case under test should reject overwrites anyway.
      const fetched = await orderRepo.findById(params.id);
      if (fetched.ok) {
        // Mutate the in-memory row by re-creating it via update().
        (fetched.value as { discountMinor: number }).discountMinor = params.discountMinor;
        (fetched.value as { totalMinor: number }).totalMinor =
          params.totalMinor - params.discountMinor;
        await orderRepo.update(fetched.value);
      }
    }
  }

  it("applies a percentage code and audits order.discount_applied", async () => {
    await seedPaidOrder({ id: "o1", totalMinor: 100000 });
    const code = createDiscountCode({
      id: "dc-1",
      code: "WELCOME20",
      type: "PERCENTAGE",
      value: 20,
    });
    if (!code.ok) throw new Error("seed");
    const created = await discountCodeRepo.create(code.value);
    if (!created.ok) throw new Error("seed");

    const r = await useCase.execute({
      orderId: "o1",
      actorId: ADMIN_ID,
      code: "WELCOME20",
    });

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.discountMinor).toBe(20000);
    expect(r.value.discountCodeId).toBe("dc-1");
    expect(r.value.order.discountMinor).toBe(20000);
    expect(r.value.order.totalMinor).toBe(80000);

    const auditPage = await auditLog.list({ limit: 100 });
    expect(auditPage.ok).toBe(true);
    if (!auditPage.ok) return;
    const apply = auditPage.value.entries.find((a) => a.action === "order.discount_applied");
    expect(apply).toBeDefined();
    expect(apply?.actorId).toBe(ADMIN_ID);
    expect(apply?.targetType).toBe("order");
    expect(apply?.targetId).toBe("o1");
    expect(apply?.metadata).toMatchObject({
      discountCodeId: "dc-1",
      discountCode: "WELCOME20",
      discountMinor: 20000,
    });
  });

  it("increments the code's usedCount", async () => {
    await seedPaidOrder({ id: "o1", totalMinor: 100000 });
    const code = createDiscountCode({
      id: "dc-1",
      code: "FIXED500",
      type: "FIXED",
      value: 50000,
    });
    if (!code.ok) throw new Error("seed");
    await discountCodeRepo.create(code.value);

    const r = await useCase.execute({
      orderId: "o1",
      actorId: ADMIN_ID,
      code: "fixed500",
    });
    expect(r.ok).toBe(true);

    const after = await discountCodeRepo.findById("dc-1");
    expect(after.ok).toBe(true);
    if (!after.ok) return;
    expect(after.value?.usedCount).toBe(1);
  });

  it("rejects non-PAID orders", async () => {
    await orderRepo.seedPendingOrder({
      id: "o1",
      userId: "u1",
      courseId: "c1",
      paymongoPaymentId: "cs_p",
      paymongoCheckoutUrl: "http://x",
    });
    const code = createDiscountCode({
      id: "dc-1",
      code: "FIXED100",
      type: "FIXED",
      value: 10000,
    });
    if (!code.ok) throw new Error("seed");
    await discountCodeRepo.create(code.value);

    const r = await useCase.execute({
      orderId: "o1",
      actorId: ADMIN_ID,
      code: "FIXED100",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("order_not_paid");
  });

  it("rejects an order that already has a discount applied", async () => {
    await seedPaidOrder({ id: "o1", totalMinor: 100000, discountMinor: 5000 });
    const code = createDiscountCode({
      id: "dc-1",
      code: "FIXED100",
      type: "FIXED",
      value: 10000,
    });
    if (!code.ok) throw new Error("seed");
    await discountCodeRepo.create(code.value);

    const r = await useCase.execute({
      orderId: "o1",
      actorId: ADMIN_ID,
      code: "FIXED100",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("discount_already_applied");
  });

  it("rejects an unknown code", async () => {
    await seedPaidOrder({ id: "o1", totalMinor: 100000 });

    const r = await useCase.execute({
      orderId: "o1",
      actorId: ADMIN_ID,
      code: "NOPE",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("code_not_found");
  });

  it("rejects an expired code", async () => {
    await seedPaidOrder({ id: "o1", totalMinor: 100000 });
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const code = createDiscountCode({
      id: "dc-1",
      code: "OLD",
      type: "PERCENTAGE",
      value: 10,
      validUntil: past,
    });
    if (!code.ok) throw new Error("seed");
    await discountCodeRepo.create(code.value);

    const r = await useCase.execute({
      orderId: "o1",
      actorId: ADMIN_ID,
      code: "OLD",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("code_expired");
  });

  it("rejects a maxed-out code", async () => {
    await seedPaidOrder({ id: "o1", totalMinor: 100000 });
    const code = createDiscountCode({
      id: "dc-1",
      code: "ONCE",
      type: "PERCENTAGE",
      value: 10,
      maxUses: 1,
    });
    if (!code.ok) throw new Error("seed");
    await discountCodeRepo.create(code.value);
    // Pre-bump usedCount to maxUses.
    await discountCodeRepo.incrementUsedCount("dc-1");

    const r = await useCase.execute({
      orderId: "o1",
      actorId: ADMIN_ID,
      code: "ONCE",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("code_maxed_out");
  });

  it("rejects a course that is not in the code's courseIds list", async () => {
    await seedPaidOrder({ id: "o1", totalMinor: 100000 });
    const code = createDiscountCode({
      id: "dc-1",
      code: "COURSEONLY",
      type: "PERCENTAGE",
      value: 10,
      courseIds: ["other-course"],
    });
    if (!code.ok) throw new Error("seed");
    await discountCodeRepo.create(code.value);

    const r = await useCase.execute({
      orderId: "o1",
      actorId: ADMIN_ID,
      code: "COURSEONLY",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("code_not_applicable");
  });
});

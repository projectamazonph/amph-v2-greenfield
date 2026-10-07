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
import { InMemoryCourseRepository } from "@/infra/repositories/InMemoryCourseRepository";
import { InMemoryUserRepository } from "@/infra/repositories/InMemoryUserRepository";
import { InMemoryEnrollmentRepository } from "@/infra/repositories/InMemoryEnrollmentRepository";
import { InMemoryEmailSender } from "@/infra/email/InMemoryEmailSender";
import { RefundTemplateRenderer } from "@/infra/email/templates/RefundTemplateRenderer";
import { InMemoryEmailTemplateRepository } from "@/infra/repositories/InMemoryEmailTemplateRepository";
import { createEnrollment } from "@/domain/entities/Enrollment";
import { TestLogger } from "@/infra/observability/TestLogger";

const ADMIN_ID = "admin_1";

describe("RefundOverride", () => {
  let orderRepo: InMemoryOrderRepository;
  let paymentGateway: StubPaymentGateway;
  let courseRepo: InMemoryCourseRepository;
  let userRepo: InMemoryUserRepository;
  let enrollmentRepo: InMemoryEnrollmentRepository;
  let emailSender: InMemoryEmailSender;
  let auditLog: InMemoryAuditLog;
  let useCase: RefundOverride;

  beforeEach(() => {
    orderRepo = new InMemoryOrderRepository();
    paymentGateway = new StubPaymentGateway();
    courseRepo = new InMemoryCourseRepository();
    userRepo = new InMemoryUserRepository();
    enrollmentRepo = new InMemoryEnrollmentRepository();
    emailSender = new InMemoryEmailSender();
    auditLog = new InMemoryAuditLog();
    const recordAuditLog = new RecordAuditLog({
      auditLog,
      idGen: { newId: () => `ale_${Date.now()}`, paymentRef: () => "x", receiptNumber: () => "x" },
      clock: new SystemClock(),
      logger: new TestLogger(),
    });
    useCase = new RefundOverride({
      orderRepo,
      paymentGateway,
      recordAuditLog,
      enrollmentRepo,
      courseRepo,
      userRepo,
      emailSender,
      refundEmailRenderer: new RefundTemplateRenderer(),
      logger: new TestLogger(),
      emailTemplateRepo: new InMemoryEmailTemplateRepository(),
    });
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
      actorId: ADMIN_ID,
      amountMinor: 1000,
      reason: "Goodwill",
      overrideReason: "Customer escalated; support approved",
    });

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.order.status).toBe("REFUNDED");
    expect(r.value.refundId).toMatch(/^re_test_/);
  });

  it("bypasses the 7-day window", async () => {
    await orderRepo.seedPaidOrder({
      id: "o1",
      userId: "u1",
      courseId: "c1",
      totalMinor: 1000,
      paymongoPaymentId: "cs_paid_1",
    });
    const order = (await orderRepo.findById("o1")) as {
      ok: true;
      value: { paymongoPaidAt: Date | null };
    };
    if (order.ok) {
      order.value.paymongoPaidAt = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    }

    const r = await useCase.execute({
      orderId: "o1",
      actorId: ADMIN_ID,
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
      actorId: ADMIN_ID,
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
      actorId: ADMIN_ID,
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
      actorId: ADMIN_ID,
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
      actorId: ADMIN_ID,
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
      actorId: ADMIN_ID,
      amountMinor: 1000,
      reason: "x",
      overrideReason: "y",
    });
    const r = await useCase.execute({
      orderId: "o1",
      actorId: ADMIN_ID,
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
      actorId: ADMIN_ID,
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
      actorId: ADMIN_ID,
      amountMinor: 1000,
      reason: "x",
      overrideReason: "y",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("refund_failed");
  });

  it("sends the refund-processed email when the user and course are found", async () => {
    await orderRepo.seedPaidOrder({
      id: "o1",
      userId: "u1",
      courseId: "c1",
      totalMinor: 1000,
      paymongoPaymentId: "cs_paid_1",
    });
    await userRepo.create({
      id: "u1",
      email: "student@example.com",
      passwordHash: "hash",
      firstName: "Ana",
      lastName: "Reyes",
    });
    courseRepo.seed([
      {
        id: "c1",
        slug: "test-course",
        title: "PPC Foundations",
        tagline: "",
        description: "",
        price: { minor: 1000, currency: "PHP" },
        curriculum: { sections: [] },
        coverImage: null,
        isFeatured: false,
        displayOrder: 0,
        status: "PUBLISHED",
        courseTier: "STARTER",
        previewLessonCount: 0,
        createdAt: new Date("2026-01-01T00:00:00Z"),
        moduleIds: [],
      } as never,
    ]);

    const r = await useCase.execute({
      orderId: "o1",
      actorId: ADMIN_ID,
      amountMinor: 1000,
      reason: "Goodwill",
      overrideReason: "Customer escalated; support approved",
    });

    expect(r.ok).toBe(true);
    expect(emailSender.sent).toHaveLength(1);
    expect(emailSender.sent[0]?.to).toBe("student@example.com");
  });

  it("revokes the matching enrollment and audits enrollment.revoked_by_refund", async () => {
    await orderRepo.seedPaidOrder({
      id: "o1",
      userId: "u1",
      courseId: "c1",
      totalMinor: 1000,
      paymongoPaymentId: "cs_paid_1",
    });
    const seeded = createEnrollment({
      id: "e1",
      userId: "u1",
      courseId: "c1",
      source: "direct",
      couponCode: null,
      couponDiscount: null,
      createdAt: new Date(),
    });
    if (!seeded.ok) throw new Error("seed");
    const created = await enrollmentRepo.create(seeded.value);
    if (!created.ok) throw new Error("seed");

    const r = await useCase.execute({
      orderId: "o1",
      actorId: ADMIN_ID,
      amountMinor: 1000,
      reason: "Goodwill",
      overrideReason: "Customer escalated",
    });
    expect(r.ok).toBe(true);

    const after = await enrollmentRepo.findByUserIdAndCourseId("u1", "c1");
    expect(after?.status).toBe("cancelled");

    const auditPage = await auditLog.list({ limit: 100 });
    expect(auditPage.ok).toBe(true);
    if (!auditPage.ok) return;
    const revoke = auditPage.value.entries.find((a) => a.action === "enrollment.revoked_by_refund");
    expect(revoke).toBeDefined();
    expect(revoke?.actorId).toBe(ADMIN_ID);
    expect(revoke?.targetType).toBe("enrollment");
    expect(revoke?.targetId).toBe("e1");
    expect(revoke?.metadata).toMatchObject({ orderId: "o1", trigger: "refund_override" });
  });
});

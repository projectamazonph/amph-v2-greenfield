/**
 * ProcessRefund.test.ts — STORY-049.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ProcessRefund } from "@/usecases/ProcessRefund";
import { InMemoryOrderRepository } from "@/infra/payment/InMemoryOrderRepository";
import { StubPaymentGateway } from "@/infra/payment/StubPaymentGateway";
import { InMemoryCourseRepository } from "@/infra/repositories/InMemoryCourseRepository";
import { InMemoryUserRepository } from "@/infra/repositories/InMemoryUserRepository";
import { InMemoryEnrollmentRepository } from "@/infra/repositories/InMemoryEnrollmentRepository";
import { InMemoryEmailSender } from "@/infra/email/InMemoryEmailSender";
import { RefundTemplateRenderer } from "@/infra/email/templates/RefundTemplateRenderer";
import { InMemoryEmailTemplateRepository } from "@/infra/repositories/InMemoryEmailTemplateRepository";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { createEmailTemplate } from "@/domain/entities/EmailTemplate";
import { createEnrollment } from "@/domain/entities/Enrollment";
import { TestLogger } from "@/infra/observability/TestLogger";
import { FixedClock, SystemClock } from "@/ports/system/Clock";
import { InMemoryIdGenerator } from "@/infra/system/InMemoryIdGenerator";

const ADMIN_ID = "admin-1";

describe("ProcessRefund", () => {
  let orderRepo: InMemoryOrderRepository;
  let paymentGateway: StubPaymentGateway;
  let courseRepo: InMemoryCourseRepository;
  let userRepo: InMemoryUserRepository;
  let enrollmentRepo: InMemoryEnrollmentRepository;
  let emailSender: InMemoryEmailSender;
  let emailTemplateRepo: InMemoryEmailTemplateRepository;
  let auditLogRepo: InMemoryAuditLog;
  let idGen: InMemoryIdGenerator;
  let useCase: ProcessRefund;

  beforeEach(() => {
    orderRepo = new InMemoryOrderRepository();
    paymentGateway = new StubPaymentGateway();
    courseRepo = new InMemoryCourseRepository();
    userRepo = new InMemoryUserRepository();
    enrollmentRepo = new InMemoryEnrollmentRepository();
    emailSender = new InMemoryEmailSender();
    emailTemplateRepo = new InMemoryEmailTemplateRepository();
    auditLogRepo = new InMemoryAuditLog();
    idGen = new InMemoryIdGenerator();
    // Use SystemClock so the seed's `new Date()` (which sets paymongoPaidAt)
    // matches the clock's "now". The window test overrides to a future date.
    useCase = new ProcessRefund({
      orderRepo,
      paymentGateway,
      clock: new SystemClock(),
      courseRepo,
      userRepo,
      enrollmentRepo,
      emailSender,
      refundEmailRenderer: new RefundTemplateRenderer(),
      logger: new TestLogger(),
      emailTemplateRepo,
      recordAuditLog: new RecordAuditLog({
        auditLog: auditLogRepo,
        idGen,
        clock: new SystemClock(),
        logger: new TestLogger(),
      }),
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
      actorId: ADMIN_ID,
      amountMinor: 1000,
      reason: "x",
    });

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.order.status).toBe("REFUNDED");
    expect(r.value.refundId).toMatch(/^re_test_/);

    expect(paymentGateway.refundCalls).toHaveLength(1);
    expect(paymentGateway.refundCalls[0]).toEqual({
      paymongoPaymentId: "cs_paid_1",
      amountMinor: 1000,
      reason: "x",
    });
  });

  it("returns order_not_found when the order doesn't exist", async () => {
    const r = await useCase.execute({
      orderId: "missing",
      actorId: ADMIN_ID,
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
      actorId: ADMIN_ID,
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
      actorId: ADMIN_ID,
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
      actorId: ADMIN_ID,
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
      actorId: ADMIN_ID,
      amountMinor: 2000,
      reason: "x",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("amount_exceeds_total");
  });

  it("returns outside_refund_window when paid > 7 days ago", async () => {
    await orderRepo.seedPaidOrder({
      id: "o1",
      userId: "u1",
      courseId: "c1",
      totalMinor: 1000,
      paymongoPaymentId: "cs_paid_1",
    });
    // The seed marks paid at `new Date()` (now). Use a fixed clock 8 days later.
    useCase = new ProcessRefund({
      orderRepo,
      paymentGateway,
      clock: new FixedClock(new Date(Date.now() + 8 * 24 * 60 * 60 * 1000)),
      courseRepo,
      userRepo,
      enrollmentRepo,
      emailSender,
      refundEmailRenderer: new RefundTemplateRenderer(),
      logger: new TestLogger(),
      emailTemplateRepo: new InMemoryEmailTemplateRepository(),
      recordAuditLog: new RecordAuditLog({
        auditLog: auditLogRepo,
        idGen,
        clock: new FixedClock(new Date(Date.now() + 8 * 24 * 60 * 60 * 1000)),
        logger: new TestLogger(),
      }),
    });

    const r = await useCase.execute({
      orderId: "o1",
      actorId: ADMIN_ID,
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
      message: "PayMongo timed out",
    };

    const r = await useCase.execute({
      orderId: "o1",
      actorId: ADMIN_ID,
      amountMinor: 1000,
      reason: "x",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("refund_failed");
  });

  it("returns no_paymongo_payment_id when the order has no PayMongo id", async () => {
    await orderRepo.seedPaidOrder({
      id: "o1",
      userId: "u1",
      courseId: "c1",
      totalMinor: 1000,
      paymongoPaymentId: "cs_paid_placeholder",
    });
    const fetched = await orderRepo.findById("o1");
    if (fetched.ok) fetched.value.paymongoPaymentId = null;

    const r = await useCase.execute({
      orderId: "o1",
      actorId: ADMIN_ID,
      amountMinor: 1000,
      reason: "x",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("no_paymongo_payment_id");
  });

  it("returns already_refunded when the order is already REFUNDED", async () => {
    await orderRepo.seedPaidOrder({
      id: "o1",
      userId: "u1",
      courseId: "c1",
      totalMinor: 1000,
      paymongoPaymentId: "cs_paid_1",
    });

    await useCase.execute({ orderId: "o1", actorId: ADMIN_ID, amountMinor: 1000, reason: "x" });
    const r = await useCase.execute({
      orderId: "o1",
      actorId: ADMIN_ID,
      amountMinor: 1000,
      reason: "y",
    });

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

    await useCase.execute({ orderId: "o1", actorId: ADMIN_ID, amountMinor: 1000, reason: "x" });

    const persisted = await orderRepo.findById("o1");
    expect(persisted.ok).toBe(true);
    if (!persisted.ok) return;
    expect(persisted.value.status).toBe("REFUNDED");
    expect(persisted.value.refundAmountMinor).toBe(1000);
    expect(persisted.value.refundReason).toBe("x");
  });

  it("revokes the matching enrollment and audits enrollment.revoked_by_refund", async () => {
    await orderRepo.seedPaidOrder({
      id: "o1",
      userId: "u1",
      courseId: "c1",
      totalMinor: 1000,
      paymongoPaymentId: "cs_paid_1",
    });
    const enrolled = createEnrollment({
      id: "e1",
      userId: "u1",
      courseId: "c1",
      source: "direct",
      couponCode: null,
      couponDiscount: null,
      createdAt: new Date(),
    });
    if (!enrolled.ok) throw new Error("seed");
    const seedResult = await enrollmentRepo.create(enrolled.value);
    if (!seedResult.ok) throw new Error("seed");

    const r = await useCase.execute({
      orderId: "o1",
      actorId: ADMIN_ID,
      amountMinor: 1000,
      reason: "Customer requested",
    });

    expect(r.ok).toBe(true);
    const after = await enrollmentRepo.findByUserIdAndCourseId("u1", "c1");
    expect(after?.status).toBe("cancelled");

    const auditPage = await auditLogRepo.list({ limit: 100 });
    expect(auditPage.ok).toBe(true);
    if (!auditPage.ok) return;
    const revoke = auditPage.value.entries.find((a) => a.action === "enrollment.revoked_by_refund");
    expect(revoke).toBeDefined();
    expect(revoke?.actorId).toBe(ADMIN_ID);
    expect(revoke?.targetType).toBe("enrollment");
    expect(revoke?.targetId).toBe("e1");
    expect(revoke?.metadata).toMatchObject({ orderId: "o1", trigger: "process_refund" });
  });

  it("does not double-cancel an enrollment that is already non-active", async () => {
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
    // Move it to "cancelled" before the refund runs (admin already cancelled).
    const cancelledSeed = { ...created.value, status: "cancelled" as const };
    const updated = await enrollmentRepo.update(cancelledSeed);
    if (!updated.ok) throw new Error("seed");
    auditLogRepo.clear();

    const r = await useCase.execute({
      orderId: "o1",
      actorId: ADMIN_ID,
      amountMinor: 1000,
      reason: "x",
    });
    expect(r.ok).toBe(true);
    const auditPage = await auditLogRepo.list({ limit: 100 });
    expect(auditPage.ok).toBe(true);
    if (!auditPage.ok) return;
    expect(
      auditPage.value.entries.find((a) => a.action === "enrollment.revoked_by_refund"),
    ).toBeUndefined();
  });

  it("does not fail the refund when there is no matching enrollment", async () => {
    await orderRepo.seedPaidOrder({
      id: "o1",
      userId: "u1",
      courseId: "c1",
      totalMinor: 1000,
      paymongoPaymentId: "cs_paid_1",
    });
    // No enrollment seeded.

    const r = await useCase.execute({
      orderId: "o1",
      actorId: ADMIN_ID,
      amountMinor: 1000,
      reason: "x",
    });
    expect(r.ok).toBe(true);
    const auditPage = await auditLogRepo.list({ limit: 100 });
    expect(auditPage.ok).toBe(true);
    if (!auditPage.ok) return;
    expect(
      auditPage.value.entries.find((a) => a.action === "enrollment.revoked_by_refund"),
    ).toBeUndefined();
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
      reason: "Customer requested",
    });

    expect(r.ok).toBe(true);
    expect(emailSender.sent).toHaveLength(1);
    expect(emailSender.sent[0]?.to).toBe("student@example.com");
    expect(emailSender.sent[0]?.subject).toContain("o1");
  });

  it("personalizes the refund template and renders its CTA", async () => {
    const templateResult = createEmailTemplate({
      id: "tpl-refund",
      type: "refund",
      subject: "Refund {{orderNumber}} for {{firstName}}",
      headline: "Custom refund headline for {{firstName}}",
      introBody: "Custom refund intro for {{courseTitle}}. Reason: {{reason}}.",
      ctaLabel: "Review your account",
      updatedById: "admin-1",
    });
    if (!templateResult.ok) throw new Error("seed");
    emailTemplateRepo.seed(templateResult.value);

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
      reason: "Customer requested",
    });

    expect(r.ok).toBe(true);
    expect(emailSender.sent).toHaveLength(1);
    expect(emailSender.sent[0]?.subject).toBe("Refund o1 for Ana");
    const html = emailSender.sent[0]!.html;
    expect(html).toContain("Custom refund headline for Ana");
    expect(html).toContain("Custom refund intro for PPC Foundations. Reason: Customer requested.");
    expect(html).toContain("Review your account");
    expect(html).not.toContain("{{");
  });

  it("does not fail the refund when the user/course lookup fails for the email step", async () => {
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
    });

    expect(r.ok).toBe(true);
    expect(emailSender.sent).toHaveLength(0);
  });
});

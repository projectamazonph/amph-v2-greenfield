import { beforeEach, describe, expect, it } from "vitest";
import { Order } from "@/domain/entities/Order";
import { createEnrollment } from "@/domain/entities/Enrollment";
import { InMemoryOrderRepository } from "@/infra/payment/InMemoryOrderRepository";
import { InMemoryEnrollmentRepository } from "@/infra/repositories/InMemoryEnrollmentRepository";
import { FixedClock } from "@/ports/system/Clock";
import { RequestRefund } from "@/usecases/RequestRefund";

function paidOrder(overrides: Partial<Parameters<typeof Order.hydrate>[0]> = {}) {
  return Order.hydrate({
    id: "order-1",
    userId: "student-1",
    courseId: "course-1",
    subtotalMinor: 299900,
    discountMinor: 0,
    totalMinor: 299900,
    currency: "PHP",
    status: "PAID",
    paymongoPaymentId: "payment-1",
    paymongoCheckoutUrl: null,
    paymongoStatus: "paid",
    paymongoPaidAt: new Date("2026-08-05T00:00:00Z"),
    refundReason: null,
    refundRequestedAt: null,
    refundProcessedAt: null,
    refundAmountMinor: null,
    createdAt: new Date("2026-08-05T00:00:00Z"),
    updatedAt: new Date("2026-08-05T00:00:00Z"),
    ...overrides,
  });
}

describe("RequestRefund", () => {
  let orderRepo: InMemoryOrderRepository;
  let enrollmentRepo: InMemoryEnrollmentRepository;
  let useCase: RequestRefund;

  beforeEach(async () => {
    orderRepo = new InMemoryOrderRepository();
    enrollmentRepo = new InMemoryEnrollmentRepository();
    await orderRepo.create(paidOrder());
    const enrollment = createEnrollment({
      id: "enrollment-1",
      userId: "student-1",
      courseId: "course-1",
    });
    if (!enrollment.ok) throw new Error("enrollment seed failed");
    enrollment.value.progressPercent = 20;
    await enrollmentRepo.create(enrollment.value);
    useCase = new RequestRefund({
      orderRepo,
      enrollmentRepo,
      clock: new FixedClock(new Date("2026-08-10T00:00:00Z")),
    });
  });

  it("records an eligible student's refund request", async () => {
    const result = await useCase.execute({
      userId: "student-1",
      orderId: "order-1",
      reason: "The course is not the right fit for my current role.",
    });

    expect(result.ok).toBe(true);
    const persisted = await orderRepo.findById("order-1");
    expect(persisted.ok && persisted.value.refundRequestedAt?.toISOString()).toBe(
      "2026-08-10T00:00:00.000Z",
    );
  });

  it("does not reveal or mutate another student's order", async () => {
    const result = await useCase.execute({
      userId: "student-2",
      orderId: "order-1",
      reason: "This reason is long enough to be accepted.",
    });

    expect(result).toEqual({ ok: false, error: { kind: "order_not_found" } });
  });

  it("rejects requests outside the seven-day window", async () => {
    await orderRepo.update(paidOrder({ paymongoPaidAt: new Date("2026-07-01T00:00:00Z") }));

    const result = await useCase.execute({
      userId: "student-1",
      orderId: "order-1",
      reason: "This reason is long enough to be accepted.",
    });

    expect(result).toEqual({ ok: false, error: { kind: "refund_window_expired" } });
  });

  it("rejects requests at or above 25 percent completion", async () => {
    const enrollment = await enrollmentRepo.findByUserIdAndCourseId("student-1", "course-1");
    if (!enrollment) throw new Error("missing enrollment");
    enrollment.progressPercent = 25;

    const result = await useCase.execute({
      userId: "student-1",
      orderId: "order-1",
      reason: "This reason is long enough to be accepted.",
    });

    expect(result).toEqual({
      ok: false,
      error: { kind: "completion_limit_reached", progressPercent: 25 },
    });
  });

  it("is idempotent and does not overwrite the original reason", async () => {
    const first = await useCase.execute({
      userId: "student-1",
      orderId: "order-1",
      reason: "The original reason for requesting a refund.",
    });
    const second = await useCase.execute({
      userId: "student-1",
      orderId: "order-1",
      reason: "A different reason that should not replace it.",
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    const persisted = await orderRepo.findById("order-1");
    expect(persisted.ok && persisted.value.refundReason).toBe(
      "The original reason for requesting a refund.",
    );
  });
});

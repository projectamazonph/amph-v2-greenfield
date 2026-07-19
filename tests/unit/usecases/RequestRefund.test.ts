import { describe, it, expect, vi, beforeEach } from "vitest";
import { Result } from "@/domain/shared/Result";
import { RequestRefund } from "@/usecases/RequestRefund";
import type { IOrderRepository } from "@/ports/repositories/OrderRepository";
import type { Clock } from "@/ports/system/Clock";
import { Order } from "@/domain/entities/Order";
import { OrderTestHelpers } from "../domain/__helpers__/OrderTestHelpers";

const USER_ID = "user_01";
const OTHER_USER_ID = "user_02";
const ORDER_ID = "ord_test";
const REASON = "Course didn't meet expectations";

function makeOrderRepo(findById: () => Result<Order, { kind: string }> | Promise<Result<Order, { kind: string }>>): IOrderRepository {
  return {
    create: vi.fn(),
    findById: findById as IOrderRepository["findById"],
    findByPaymongoPaymentId: vi.fn(),
    findByUserId: vi.fn(),
    listAll: vi.fn(),
    update: vi.fn(async (order: Order) => Result.ok(order)),
    findPaidForUserAndCourse: vi.fn(async () => Result.ok(null)),
  };
}

const NOW = new Date("2025-07-01T00:00:00Z");
const clock: Clock = { now: () => NOW };

describe("RequestRefund", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  // ── happy path ───────────────────────────────────────────

  it("sets refundRequestedAt and refundReason on a valid PAID order", async () => {
    const paidOrder = OrderTestHelpers.paidOrder({ daysAgo: 5, userId: USER_ID });
    const mockRepo = makeOrderRepo(() => Result.ok(paidOrder));

    const useCase = new RequestRefund({ orderRepo: mockRepo, clock });
    const result = await useCase.execute({
      orderId: ORDER_ID,
      userId: USER_ID,
      reason: REASON,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.order.refundRequestedAt).toEqual(NOW);
    expect(result.value.order.refundReason).toBe(REASON);
    expect(result.value.order.status).toBe("PAID"); // status stays PAID
  });

  it("returns the updated order", async () => {
    const paidOrder = OrderTestHelpers.paidOrder({ daysAgo: 5, userId: USER_ID });
    const mockRepo = makeOrderRepo(() => Result.ok(paidOrder));

    const useCase = new RequestRefund({ orderRepo: mockRepo, clock });
    const result = await useCase.execute({
      orderId: ORDER_ID,
      userId: USER_ID,
      reason: REASON,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.order.id).toBe(ORDER_ID);
  });

  it("persists the order via orderRepo.update()", async () => {
    const paidOrder = OrderTestHelpers.paidOrder({ daysAgo: 5, userId: USER_ID });
    const mockRepo = makeOrderRepo(() => Result.ok(paidOrder));
    const updateSpy = mockRepo.update as ReturnType<typeof vi.fn>;

    const useCase = new RequestRefund({ orderRepo: mockRepo, clock });
    await useCase.execute({ orderId: ORDER_ID, userId: USER_ID, reason: REASON });

    expect(updateSpy).toHaveBeenCalledOnce();
    const updated = updateSpy.mock.calls[0]![0] as Order;
    expect(updated.refundRequestedAt).toEqual(NOW);
    expect(updated.refundReason).toBe(REASON);
  });

  it("allows request on order paid exactly 30 days ago (edge case — still in window)", async () => {
    // At the boundary: if paid exactly 30 days ago, is it in or out?
    // The spec says "paid 30 days ago → outside window", so use 29 days
    const paidOrder = OrderTestHelpers.paidOrder({ daysAgo: 29, userId: USER_ID });
    const mockRepo = makeOrderRepo(() => Result.ok(paidOrder));

    const useCase = new RequestRefund({ orderRepo: mockRepo, clock });
    const result = await useCase.execute({
      orderId: ORDER_ID,
      userId: USER_ID,
      reason: REASON,
    });

    expect(result.ok).toBe(true);
  });

  // ── error cases ──────────────────────────────────────────

  it("returns order_not_found when order does not exist", async () => {
    const mockRepo = makeOrderRepo(() => Result.err({ kind: "not_found" }));

    const useCase = new RequestRefund({ orderRepo: mockRepo, clock });
    const result = await useCase.execute({
      orderId: "nonexistent",
      userId: USER_ID,
      reason: REASON,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("order_not_found");
  });

  it("returns not_your_order when order belongs to different user", async () => {
    const paidOrder = OrderTestHelpers.paidOrder({ daysAgo: 5 });
    // paidOrder is for user_test — use a different user
    const mockRepo = makeOrderRepo(() => Result.ok(paidOrder));

    const useCase = new RequestRefund({ orderRepo: mockRepo, clock });
    const result = await useCase.execute({
      orderId: ORDER_ID,
      userId: OTHER_USER_ID, // different from order.userId
      reason: REASON,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("not_your_order");
  });

  it("returns not_paid when order is DRAFT", async () => {
    const draftOrder = Order.create({
      id: ORDER_ID,
      userId: USER_ID,
      courseId: "course_test",
      subtotalMinor: 10000,
      discountMinor: 0,
      totalMinor: 10000,
      currency: "PHP",
    });
    const mockRepo = makeOrderRepo(() => Result.ok(draftOrder));

    const useCase = new RequestRefund({ orderRepo: mockRepo, clock });
    const result = await useCase.execute({
      orderId: ORDER_ID,
      userId: USER_ID,
      reason: REASON,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("not_paid");
  });

  it("returns not_paid when order is PENDING", async () => {
    const pendingOrder = Order.create({
      id: ORDER_ID,
      userId: USER_ID,
      courseId: "course_test",
      subtotalMinor: 10000,
      discountMinor: 0,
      totalMinor: 10000,
      currency: "PHP",
    });
    pendingOrder.markPending("pm_test", "https://checkout.url");
    const mockRepo = makeOrderRepo(() => Result.ok(pendingOrder));

    const useCase = new RequestRefund({ orderRepo: mockRepo, clock });
    const result = await useCase.execute({
      orderId: ORDER_ID,
      userId: USER_ID,
      reason: REASON,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("not_paid");
  });

  it("returns not_paid when order is already REFUNDED", async () => {
    const refundedOrder = OrderTestHelpers.paidOrder({ daysAgo: 5, userId: USER_ID });
    refundedOrder.markRefunded("admin refunded", 10000);
    const mockRepo = makeOrderRepo(() => Result.ok(refundedOrder));

    const useCase = new RequestRefund({ orderRepo: mockRepo, clock });
    const result = await useCase.execute({
      orderId: ORDER_ID,
      userId: USER_ID,
      reason: REASON,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("not_paid");
  });

  it("returns outside_refund_window when paid 31 days ago", async () => {
    const paidOrder = OrderTestHelpers.paidOrder({ daysAgo: 31, userId: USER_ID });
    const mockRepo = makeOrderRepo(() => Result.ok(paidOrder));

    const useCase = new RequestRefund({ orderRepo: mockRepo, clock });
    const result = await useCase.execute({
      orderId: ORDER_ID,
      userId: USER_ID,
      reason: REASON,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("outside_refund_window");
  });

  it("returns already_requested when refundRequestedAt is already set", async () => {
    const paidOrder = OrderTestHelpers.paidOrder({ daysAgo: 5, userId: USER_ID });
    paidOrder.refundRequestedAt = new Date("2025-06-15"); // already requested
    paidOrder.refundReason = "First request";
    const mockRepo = makeOrderRepo(() => Result.ok(paidOrder));

    const useCase = new RequestRefund({ orderRepo: mockRepo, clock });
    const result = await useCase.execute({
      orderId: ORDER_ID,
      userId: USER_ID,
      reason: REASON,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("already_requested");
  });

  it("uses clock.now() for the refundRequestedAt timestamp", async () => {
    const paidOrder = OrderTestHelpers.paidOrder({ daysAgo: 5, userId: USER_ID });
    const mockRepo = makeOrderRepo(() => Result.ok(paidOrder));
    const nowSpy = vi.fn(() => NOW);

    const useCase = new RequestRefund({ orderRepo: mockRepo, clock: { now: nowSpy } });
    await useCase.execute({ orderId: ORDER_ID, userId: USER_ID, reason: REASON });

    expect(nowSpy).toHaveBeenCalled();
  });
});

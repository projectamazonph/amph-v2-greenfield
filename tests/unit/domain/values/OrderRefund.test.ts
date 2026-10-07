import { describe, it, expect } from "vitest";
import {
  isWithinRefundWindow,
  REFUND_WINDOW_DAYS,
  REFUND_WINDOW_MS,
} from "@/domain/values/OrderRefund";
import { Order } from "@/domain/entities/Order";
import { OrderTestHelpers } from "../__helpers__/OrderTestHelpers";

describe("OrderRefund domain value", () => {
  it("exports a single refund window of 7 days", () => {
    expect(REFUND_WINDOW_DAYS).toBe(7);
    expect(REFUND_WINDOW_MS).toBe(7 * 24 * 60 * 60 * 1000);
  });

  describe("isWithinRefundWindow", () => {
    it("paid today → within window", () => {
      const order = OrderTestHelpers.paidOrder({ daysAgo: 0 });
      expect(isWithinRefundWindow(order, new Date())).toBe(true);
    });

    it("paid 1 day ago → within window", () => {
      const order = OrderTestHelpers.paidOrder({ daysAgo: 1 });
      expect(isWithinRefundWindow(order, new Date())).toBe(true);
    });

    it("paid 6 days ago → within window", () => {
      const order = OrderTestHelpers.paidOrder({ daysAgo: 6 });
      expect(isWithinRefundWindow(order, new Date())).toBe(true);
    });

    it("paid 7 days ago → outside window", () => {
      const order = OrderTestHelpers.paidOrder({ daysAgo: 7 });
      expect(isWithinRefundWindow(order, new Date())).toBe(false);
    });

    it("paid 8 days ago → outside window", () => {
      const order = OrderTestHelpers.paidOrder({ daysAgo: 8 });
      expect(isWithinRefundWindow(order, new Date())).toBe(false);
    });

    it("paid 30 days ago → outside window", () => {
      const order = OrderTestHelpers.paidOrder({ daysAgo: 30 });
      expect(isWithinRefundWindow(order, new Date())).toBe(false);
    });

    it("order with no paymongoPaidAt → outside window", () => {
      const order = OrderTestHelpers.paidOrder({ daysAgo: 0 });
      order.paymongoPaidAt = null;
      expect(isWithinRefundWindow(order, new Date())).toBe(false);
    });

    it("exactly 6.999 days → within window", () => {
      const paidAt = new Date("2025-07-01T00:00:00Z");
      const now = new Date("2025-07-07T23:59:59Z");
      const order = Order.create({
        id: "ord_test",
        userId: "user_test",
        courseId: "course_test",
        subtotalMinor: 10000,
        discountMinor: 0,
        totalMinor: 10000,
        currency: "PHP",
      });
      order.markPending("pm_test", "https://checkout.url");
      order.markPaid(paidAt);

      expect(isWithinRefundWindow(order, now)).toBe(true);
    });

    it("at exactly 7 days → outside window", () => {
      const paidAt = new Date("2025-07-01T00:00:00Z");
      const now = new Date("2025-07-08T00:00:00Z");
      const order = Order.create({
        id: "ord_test",
        userId: "user_test",
        courseId: "course_test",
        subtotalMinor: 10000,
        discountMinor: 0,
        totalMinor: 10000,
        currency: "PHP",
      });
      order.markPending("pm_test", "https://checkout.url");
      order.markPaid(paidAt);

      expect(isWithinRefundWindow(order, now)).toBe(false);
    });
  });
});

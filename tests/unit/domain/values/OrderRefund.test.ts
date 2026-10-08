import { describe, it, expect } from "vitest";
import { isWithinRefundWindow } from "@/domain/values/OrderRefund";
import { Order } from "@/domain/entities/Order";
import { OrderTestHelpers } from "../__helpers__/OrderTestHelpers";

describe("OrderRefund domain value", () => {
  describe("isWithinRefundWindow", () => {
    it("paid today → within window", () => {
      const order = OrderTestHelpers.paidOrder({ daysAgo: 0 });
      expect(isWithinRefundWindow(order, new Date())).toBe(true);
    });

    it("paid 1 day ago → within window", () => {
      const order = OrderTestHelpers.paidOrder({ daysAgo: 1 });
      expect(isWithinRefundWindow(order, new Date())).toBe(true);
    });

    it("paid 29 days ago → within window", () => {
      const order = OrderTestHelpers.paidOrder({ daysAgo: 29 });
      expect(isWithinRefundWindow(order, new Date())).toBe(true);
    });

    it("paid 30 days ago → outside window", () => {
      const order = OrderTestHelpers.paidOrder({ daysAgo: 30 });
      expect(isWithinRefundWindow(order, new Date())).toBe(false);
    });

    it("paid 31 days ago → outside window", () => {
      const order = OrderTestHelpers.paidOrder({ daysAgo: 31 });
      expect(isWithinRefundWindow(order, new Date())).toBe(false);
    });

    it("paid 100 days ago → outside window", () => {
      const order = OrderTestHelpers.paidOrder({ daysAgo: 100 });
      expect(isWithinRefundWindow(order, new Date())).toBe(false);
    });

    it("order with no paymongoPaidAt → outside window", () => {
      const order = OrderTestHelpers.paidOrder({ daysAgo: 0 });
      order.paymongoPaidAt = null; // simulate order without payment date
      expect(isWithinRefundWindow(order, new Date())).toBe(false);
    });

    it("exactly 29.999 days → within window", () => {
      // Just under 30 days — use a custom now that's slightly before the deadline
      const paidAt = new Date("2025-07-01T00:00:00Z");
      const now = new Date("2025-07-30T23:59:59Z"); // 29 days, 23h 59m 59s later
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

    it("at exactly 30 days → outside window", () => {
      const paidAt = new Date("2025-07-01T00:00:00Z");
      const now = new Date("2025-07-31T00:00:00Z"); // exactly 30 days later
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

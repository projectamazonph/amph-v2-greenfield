import { describe, it, expect } from "vitest";
import { Order, OrderCreateParams } from "@/domain/entities/Order";

describe("Order — creation", () => {
  function makeParams(overrides: Partial<OrderCreateParams> = {}): OrderCreateParams {
    return {
      id: "order_01",
      userId: "user_01",
      courseId: "course_01",
      subtotalMinor: 299900,
      discountMinor: 0,
      totalMinor: 299900,
      currency: "PHP",
      ...overrides,
    };
  }

  it("creates with DRAFT status", () => {
    const order = Order.create(makeParams());
    expect(order.status).toBe("DRAFT");
  });

  it("records all fields", () => {
    const params = makeParams({ totalMinor: 50000, currency: "USD" });
    const order = Order.create(params);
    expect(order.id).toBe("order_01");
    expect(order.userId).toBe("user_01");
    expect(order.courseId).toBe("course_01");
    expect(order.subtotalMinor).toBe(299900);
    expect(order.discountMinor).toBe(0);
    expect(order.totalMinor).toBe(50000);
    expect(order.currency).toBe("USD");
    expect(order.paymongoPaymentId).toBeNull();
    expect(order.paymongoCheckoutUrl).toBeNull();
    expect(order.paymongoStatus).toBeNull();
    expect(order.paymongoPaidAt).toBeNull();
  });

  it("sets createdAt and updatedAt", () => {
    const before = new Date();
    const order = Order.create(makeParams());
    const after = new Date();
    expect(order.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(order.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    expect(order.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });
});

describe("Order — payment state transitions", () => {
  function makeDraft(): Order {
    return Order.create({
      id: "order_01",
      userId: "user_01",
      courseId: "course_01",
      subtotalMinor: 299900,
      discountMinor: 0,
      totalMinor: 299900,
      currency: "PHP",
    });
  }

  describe("markPending()", () => {
    it("transitions DRAFT → PENDING", () => {
      const order = makeDraft();
      order.markPending("cs_test_abc123", "https://checkout.paymongo.com/cs_abc123");
      expect(order.status).toBe("PENDING");
    });

    it("sets paymongoPaymentId", () => {
      const order = makeDraft();
      order.markPending("cs_test_abc123", "https://checkout.paymongo.com/cs_abc123");
      expect(order.paymongoPaymentId).toBe("cs_test_abc123");
    });

    it("sets paymongoCheckoutUrl", () => {
      const order = makeDraft();
      order.markPending("cs_test_abc123", "https://checkout.paymongo.com/cs_abc123");
      expect(order.paymongoCheckoutUrl).toBe("https://checkout.paymongo.com/cs_abc123");
    });

    it("throws if not DRAFT", () => {
      const order = makeDraft();
      order.markPending("cs_1", "https://example.com");
      expect(() => order.markPending("cs_2", "https://example.com")).toThrow(/PENDING/);
    });
  });

  describe("markPaid()", () => {
    it("transitions PENDING → PAID", () => {
      const order = makeDraft();
      order.markPending("cs_test", "https://example.com");
      order.markPaid();
      expect(order.status).toBe("PAID");
    });

    it("sets paymongoStatus to paid", () => {
      const order = makeDraft();
      order.markPending("cs_test", "https://example.com");
      order.markPaid();
      expect(order.paymongoStatus).toBe("paid");
    });

    it("sets paymongoPaidAt", () => {
      const order = makeDraft();
      order.markPending("cs_test", "https://example.com");
      const paidAt = new Date("2026-07-01T12:00:00Z");
      order.markPaid(paidAt);
      expect(order.paymongoPaidAt).toEqual(paidAt);
    });

    it("throws if not PENDING", () => {
      const order = makeDraft();
      expect(() => order.markPaid()).toThrow(/PENDING/);
    });

    it("throws if already PAID", () => {
      const order = makeDraft();
      order.markPending("cs_test", "https://example.com");
      order.markPaid();
      expect(() => order.markPaid()).toThrow(/PAID/);
    });
  });

  describe("markFailed()", () => {
    it("transitions PENDING → FAILED", () => {
      const order = makeDraft();
      order.markPending("cs_test", "https://example.com");
      order.markFailed();
      expect(order.status).toBe("FAILED");
    });

    it("throws if not PENDING", () => {
      const order = makeDraft();
      expect(() => order.markFailed()).toThrow(/PENDING/);
    });
  });

  describe("markExpired()", () => {
    it("transitions PENDING → EXPIRED", () => {
      const order = makeDraft();
      order.markPending("cs_test", "https://example.com");
      order.markExpired();
      expect(order.status).toBe("EXPIRED");
    });

    it("throws if not PENDING", () => {
      const order = makeDraft();
      expect(() => order.markExpired()).toThrow(/PENDING/);
    });
  });
});

describe("Order — guards", () => {
  function makePending(): Order {
    const order = Order.create({
      id: "order_01",
      userId: "user_01",
      courseId: "course_01",
      subtotalMinor: 299900,
      discountMinor: 0,
      totalMinor: 299900,
      currency: "PHP",
    });
    order.markPending("cs_test", "https://example.com");
    return order;
  }

  describe("isPaid()", () => {
    it("true when PAID", () => {
      const order = makePending();
      order.markPaid();
      expect(order.isPaid()).toBe(true);
    });

    it("false when PENDING", () => {
      expect(makePending().isPaid()).toBe(false);
    });

    it("false when FAILED", () => {
      const order = makePending();
      order.markFailed();
      expect(order.isPaid()).toBe(false);
    });
  });

  describe("canTransitionTo()", () => {
    it("DRAFT can transition to PENDING", () => {
      const order = Order.create({
        id: "o1", userId: "u1", courseId: "c1",
        subtotalMinor: 100, discountMinor: 0, totalMinor: 100, currency: "PHP",
      });
      expect(order.canTransitionTo("PENDING")).toBe(true);
    });

    it("PENDING cannot transition to PENDING", () => {
      const order = makePending();
      expect(order.canTransitionTo("PENDING")).toBe(false);
    });

    it("PAID cannot transition to PAID", () => {
      const order = makePending();
      order.markPaid();
      expect(order.canTransitionTo("PAID")).toBe(false);
    });

    it("PAID can transition to REFUNDED (full refund)", () => {
      const order = makePending();
      order.markPaid();
      expect(order.canTransitionTo("REFUNDED")).toBe(true);
    });
  });
});

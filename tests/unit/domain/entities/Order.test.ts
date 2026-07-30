import { describe, it, expect } from "vitest";
import { Order, OrderCreateParams, OrderHydrateParams } from "@/domain/entities/Order";
import type { OrderTransitionError } from "@/domain/entities/Order";

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
      const result = order.markPending("cs_test_abc123", "https://checkout.paymongo.com/cs_abc123");
      expect(result.ok).toBe(true);
      expect(order.status).toBe("PENDING");
    });

    it("sets paymongoPaymentId", () => {
      const order = makeDraft();
      const result = order.markPending("cs_test_abc123", "https://checkout.paymongo.com/cs_abc123");
      expect(result.ok).toBe(true);
      expect(order.paymongoPaymentId).toBe("cs_test_abc123");
    });

    it("sets paymongoCheckoutUrl", () => {
      const order = makeDraft();
      const result = order.markPending("cs_test_abc123", "https://checkout.paymongo.com/cs_abc123");
      expect(result.ok).toBe(true);
      expect(order.paymongoCheckoutUrl).toBe("https://checkout.paymongo.com/cs_abc123");
    });

    it("returns error if not DRAFT", () => {
      const order = makeDraft();
      order.markPending("cs_1", "https://example.com");
      const result = order.markPending("cs_2", "https://example.com");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe("invalid_transition");
        expect(result.error.message).toMatch(/PENDING/);
      }
    });
  });

  describe("markPaid()", () => {
    it("transitions PENDING → PAID", () => {
      const order = makeDraft();
      order.markPending("cs_test", "https://example.com");
      const result = order.markPaid();
      expect(result.ok).toBe(true);
      expect(order.status).toBe("PAID");
    });

    it("sets paymongoStatus to paid", () => {
      const order = makeDraft();
      order.markPending("cs_test", "https://example.com");
      const result = order.markPaid();
      expect(result.ok).toBe(true);
      expect(order.paymongoStatus).toBe("paid");
    });

    it("sets paymongoPaidAt", () => {
      const order = makeDraft();
      order.markPending("cs_test", "https://example.com");
      const paidAt = new Date("2026-07-01T12:00:00Z");
      const result = order.markPaid(paidAt);
      expect(result.ok).toBe(true);
      expect(order.paymongoPaidAt).toEqual(paidAt);
    });

    it("returns error if not PENDING", () => {
      const order = makeDraft();
      const result = order.markPaid();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe("invalid_transition");
        expect(result.error.message).toMatch(/DRAFT/);
      }
    });

    it("returns error if already PAID", () => {
      const order = makeDraft();
      order.markPending("cs_test", "https://example.com");
      order.markPaid();
      const result = order.markPaid();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe("invalid_transition");
        expect(result.error.message).toMatch(/PAID/);
      }
    });
  });

  describe("markFailed()", () => {
    it("transitions PENDING → FAILED", () => {
      const order = makeDraft();
      order.markPending("cs_test", "https://example.com");
      const result = order.markFailed();
      expect(result.ok).toBe(true);
      expect(order.status).toBe("FAILED");
    });

    it("returns error if not PENDING", () => {
      const order = makeDraft();
      const result = order.markFailed();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe("invalid_transition");
        expect(result.error.message).toMatch(/DRAFT/);
      }
    });
  });

  describe("markExpired()", () => {
    it("transitions PENDING → EXPIRED", () => {
      const order = makeDraft();
      order.markPending("cs_test", "https://example.com");
      const result = order.markExpired();
      expect(result.ok).toBe(true);
      expect(order.status).toBe("EXPIRED");
    });

    it("returns error if not PENDING", () => {
      const order = makeDraft();
      const result = order.markExpired();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe("invalid_transition");
        expect(result.error.message).toMatch(/DRAFT/);
      }
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
    const r = order.markPending("cs_test", "https://example.com");
    expect(r.ok).toBe(true);
    return order;
  }

  describe("isPaid()", () => {
    it("true when PAID", () => {
      const order = makePending();
      const r = order.markPaid();
      expect(r.ok).toBe(true);
      expect(order.isPaid()).toBe(true);
    });

    it("false when PENDING", () => {
      expect(makePending().isPaid()).toBe(false);
    });

    it("false when FAILED", () => {
      const order = makePending();
      const r = order.markFailed();
      expect(r.ok).toBe(true);
      expect(order.isPaid()).toBe(false);
    });
  });

  describe("canTransitionTo()", () => {
    it("DRAFT can transition to PENDING", () => {
      const order = Order.create({
        id: "o1",
        userId: "u1",
        courseId: "c1",
        subtotalMinor: 100,
        discountMinor: 0,
        totalMinor: 100,
        currency: "PHP",
      });
      expect(order.canTransitionTo("PENDING")).toBe(true);
    });

    it("PENDING cannot transition to PENDING", () => {
      const order = makePending();
      expect(order.canTransitionTo("PENDING")).toBe(false);
    });

    it("PAID cannot transition to PAID", () => {
      const order = makePending();
      const r = order.markPaid();
      expect(r.ok).toBe(true);
      expect(order.canTransitionTo("PAID")).toBe(false);
    });

    it("PAID can transition to REFUNDED (full refund)", () => {
      const order = makePending();
      const r = order.markPaid();
      expect(r.ok).toBe(true);
      expect(order.canTransitionTo("REFUNDED")).toBe(true);
    });
  });
});

describe("Order: hydrate() (reconstruction from persistence)", () => {
  function makeHydrateParams(overrides: Partial<OrderHydrateParams> = {}): OrderHydrateParams {
    return {
      id: "order_01",
      userId: "user_01",
      courseId: "course_01",
      subtotalMinor: 299900,
      discountMinor: 5000,
      totalMinor: 294900,
      currency: "PHP",
      status: "PAID",
      paymongoPaymentId: "cs_abc123",
      paymongoCheckoutUrl: "https://checkout.paymongo.com/cs_abc123",
      paymongoStatus: "paid",
      paymongoPaidAt: new Date("2026-07-01T12:00:00Z"),
      refundReason: null,
      refundRequestedAt: null,
      refundProcessedAt: null,
      refundAmountMinor: null,
      createdAt: new Date("2026-06-30T00:00:00Z"),
      updatedAt: new Date("2026-07-01T12:00:00Z"),
      ...overrides,
    };
  }

  it("round-trips every field exactly, including a non-DRAFT status", () => {
    const params = makeHydrateParams();
    const order = Order.hydrate(params);

    expect(order.id).toBe(params.id);
    expect(order.userId).toBe(params.userId);
    expect(order.courseId).toBe(params.courseId);
    expect(order.subtotalMinor).toBe(params.subtotalMinor);
    expect(order.discountMinor).toBe(params.discountMinor);
    expect(order.totalMinor).toBe(params.totalMinor);
    expect(order.currency).toBe(params.currency);
    expect(order.status).toBe("PAID");
    expect(order.paymongoPaymentId).toBe(params.paymongoPaymentId);
    expect(order.paymongoCheckoutUrl).toBe(params.paymongoCheckoutUrl);
    expect(order.paymongoStatus).toBe(params.paymongoStatus);
    expect(order.paymongoPaidAt).toEqual(params.paymongoPaidAt);
    expect(order.createdAt).toEqual(params.createdAt);
    expect(order.updatedAt).toEqual(params.updatedAt);
  });

  it("round-trips refund fields for a REFUNDED order", () => {
    const params = makeHydrateParams({
      status: "REFUNDED",
      refundReason: "Requested within window",
      refundRequestedAt: new Date("2026-07-05T00:00:00Z"),
      refundProcessedAt: new Date("2026-07-06T00:00:00Z"),
      refundAmountMinor: 294900,
    });
    const order = Order.hydrate(params);

    expect(order.status).toBe("REFUNDED");
    expect(order.refundReason).toBe("Requested within window");
    expect(order.refundRequestedAt).toEqual(params.refundRequestedAt);
    expect(order.refundProcessedAt).toEqual(params.refundProcessedAt);
    expect(order.refundAmountMinor).toBe(294900);
  });

  it("hydrating a DRAFT order allows the normal mark* transitions afterwards", () => {
    const order = Order.hydrate(
      makeHydrateParams({
        status: "DRAFT",
        paymongoPaymentId: null,
        paymongoCheckoutUrl: null,
        paymongoStatus: null,
        paymongoPaidAt: null,
      }),
    );

    expect(order.status).toBe("DRAFT");
    order.markPending("cs_new", "https://checkout.paymongo.com/cs_new");
    expect(order.status).toBe("PENDING");
  });

  it("does not leak hydrated state into a freshly created() order", () => {
    const order = Order.create({
      id: "order_02",
      userId: "user_02",
      courseId: "course_02",
      subtotalMinor: 100,
      discountMinor: 0,
      totalMinor: 100,
      currency: "PHP",
    });
    expect(order.status).toBe("DRAFT");
    expect(order.paymongoPaymentId).toBeNull();
    expect(order.refundAmountMinor).toBeNull();
  });
});

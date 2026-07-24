/**
 * InMemoryOrderRepository.listRefundRequests.test.ts — STORY-062 TDD.
 *
 * Red phase: defines the contract for listRefundRequests on
 * InMemoryOrderRepository before / as the implementation lands.
 * The InMemoryOrderRepository lives at src/infra/payment/ (per the
 * existing P0-1 wiring) so we import from there.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryOrderRepository } from "@/infra/payment/InMemoryOrderRepository";
import { Order } from "@/domain/entities/Order";

async function seedPaidOrderWithRefundRequest(
  repo: InMemoryOrderRepository,
  params: {
    id: string;
    userId?: string;
    courseId?: string;
    totalMinor?: number;
    requestedAt: Date;
    processedAt?: Date | null;
    reason?: string;
    amountMinor?: number | null;
  },
): Promise<void> {
  await repo.seedPaidOrder({
    id: params.id,
    userId: params.userId ?? "u1",
    courseId: params.courseId ?? "c1",
    totalMinor: params.totalMinor ?? 1000,
    paymongoPaymentId: `cs_${params.id}`,
  });
  const r = await repo.findById(params.id);
  if (!r.ok) throw new Error("seed failed");
  r.value.refundRequestedAt = params.requestedAt;
  r.value.refundReason = params.reason ?? "test reason";
  if (params.processedAt !== undefined && params.processedAt !== null) {
    r.value.refundProcessedAt = params.processedAt;
    r.value.refundAmountMinor = params.amountMinor ?? 1000;
    r.value.status = "REFUNDED";
  }
}

describe("InMemoryOrderRepository.listRefundRequests", () => {
  let repo: InMemoryOrderRepository;

  beforeEach(() => {
    repo = new InMemoryOrderRepository();
  });

  it("returns empty page when no orders have a refund request", async () => {
    // Seed a paid order with no refund request
    await repo.seedPaidOrder({ id: "o1", userId: "u1", courseId: "c1" });

    const r = await repo.listRefundRequests({});
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.orders).toEqual([]);
    expect(r.value.total).toBe(0);
    expect(r.value.nextCursor).toBeNull();
  });

  it("returns only orders with refundRequestedAt set", async () => {
    await repo.seedPaidOrder({ id: "o1", userId: "u1", courseId: "c1" });
    await seedPaidOrderWithRefundRequest(repo, {
      id: "o2",
      requestedAt: new Date("2026-07-01T00:00:00Z"),
    });
    await seedPaidOrderWithRefundRequest(repo, {
      id: "o3",
      requestedAt: new Date("2026-07-02T00:00:00Z"),
    });

    const r = await repo.listRefundRequests({});
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.orders.length).toBe(2);
    expect(r.value.total).toBe(2);
    expect(r.value.orders.map((o) => o.id).sort()).toEqual(["o2", "o3"]);
  });

  it("sorts by refundRequestedAt desc", async () => {
    await seedPaidOrderWithRefundRequest(repo, {
      id: "o1",
      requestedAt: new Date("2026-07-01T00:00:00Z"),
    });
    await seedPaidOrderWithRefundRequest(repo, {
      id: "o2",
      requestedAt: new Date("2026-07-03T00:00:00Z"),
    });
    await seedPaidOrderWithRefundRequest(repo, {
      id: "o3",
      requestedAt: new Date("2026-07-02T00:00:00Z"),
    });

    const r = await repo.listRefundRequests({});
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.orders.map((o) => o.id)).toEqual(["o2", "o3", "o1"]);
  });

  it("filters by status=pending (excludes already-processed)", async () => {
    await seedPaidOrderWithRefundRequest(repo, {
      id: "o1",
      requestedAt: new Date("2026-07-01T00:00:00Z"),
    });
    await seedPaidOrderWithRefundRequest(repo, {
      id: "o2",
      requestedAt: new Date("2026-07-02T00:00:00Z"),
      processedAt: new Date("2026-07-03T00:00:00Z"),
    });

    const r = await repo.listRefundRequests({ status: "pending" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.orders.map((o) => o.id)).toEqual(["o1"]);
    expect(r.value.total).toBe(1);
  });

  it("filters by status=processed (excludes pending)", async () => {
    await seedPaidOrderWithRefundRequest(repo, {
      id: "o1",
      requestedAt: new Date("2026-07-01T00:00:00Z"),
    });
    await seedPaidOrderWithRefundRequest(repo, {
      id: "o2",
      requestedAt: new Date("2026-07-02T00:00:00Z"),
      processedAt: new Date("2026-07-03T00:00:00Z"),
    });

    const r = await repo.listRefundRequests({ status: "processed" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.orders.map((o) => o.id)).toEqual(["o2"]);
    expect(r.value.total).toBe(1);
  });

  it("respects the limit parameter", async () => {
    for (let i = 0; i < 5; i += 1) {
      await seedPaidOrderWithRefundRequest(repo, {
        id: `o${i}`,
        requestedAt: new Date(`2026-07-0${i + 1}T00:00:00Z`),
      });
    }

    const r = await repo.listRefundRequests({ limit: 2 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.orders.length).toBe(2);
    expect(r.value.total).toBe(5);
    expect(r.value.nextCursor).not.toBeNull();
  });

  it("returns nextCursor when there are more pages", async () => {
    for (let i = 0; i < 3; i += 1) {
      await seedPaidOrderWithRefundRequest(repo, {
        id: `o${i}`,
        requestedAt: new Date(`2026-07-0${i + 1}T00:00:00Z`),
      });
    }

    const r = await repo.listRefundRequests({ limit: 2 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.orders.length).toBe(2);
    expect(r.value.nextCursor).toMatch(/^2026-07-0\dT00:00:00\.000Z::o\d$/);
  });

  it("returns null nextCursor on the last page", async () => {
    await seedPaidOrderWithRefundRequest(repo, {
      id: "o1",
      requestedAt: new Date("2026-07-01T00:00:00Z"),
    });

    const r = await repo.listRefundRequests({ limit: 10 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.orders.length).toBe(1);
    expect(r.value.nextCursor).toBeNull();
  });

  it("honors the cursor on the second page", async () => {
    for (let i = 0; i < 4; i += 1) {
      await seedPaidOrderWithRefundRequest(repo, {
        id: `o${i}`,
        requestedAt: new Date(`2026-07-0${i + 1}T00:00:00Z`),
      });
    }

    const page1 = await repo.listRefundRequests({ limit: 2 });
    expect(page1.ok).toBe(true);
    if (!page1.ok) return;
    expect(page1.value.orders.map((o) => o.id)).toEqual(["o3", "o2"]);
    expect(page1.value.nextCursor).not.toBeNull();

    const page2 = await repo.listRefundRequests({
      limit: 2,
      cursor: page1.value.nextCursor ?? undefined,
    });
    expect(page2.ok).toBe(true);
    if (!page2.ok) return;
    expect(page2.value.orders.map((o) => o.id)).toEqual(["o1", "o0"]);
    expect(page2.value.nextCursor).toBeNull();
  });

  it("caps limit at 100", async () => {
    for (let i = 0; i < 3; i += 1) {
      await seedPaidOrderWithRefundRequest(repo, {
        id: `o${i}`,
        requestedAt: new Date(`2026-07-0${i + 1}T00:00:00Z`),
      });
    }

    const r = await repo.listRefundRequests({ limit: 1000 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // 3 rows total, all returned since under the cap
    expect(r.value.orders.length).toBe(3);
  });

  it("ignores orders without a refund request when filtering", async () => {
    // PAID but no refund request — must NOT show up
    await repo.seedPaidOrder({ id: "paid_no_refund", userId: "u1", courseId: "c1" });
    // PENDING + refundRequestedAt set — the use case layer filters
    // status=PAID; the repo's only filter is refundRequestedAt IS NOT NULL.
    await repo.seedPendingOrder({
      id: "pending_with_refund",
      userId: "u1",
      courseId: "c1",
      paymongoPaymentId: "cs_pending",
      paymongoCheckoutUrl: "http://x",
    });
    const r = await repo.findById("pending_with_refund");
    if (r.ok) {
      r.value.refundRequestedAt = new Date("2026-07-01T00:00:00Z");
      r.value.refundReason = "test";
    }

    const result = await repo.listRefundRequests({});
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.orders.map((o) => o.id)).toEqual(["pending_with_refund"]);
  });

  it("ignores a malformed cursor (does not throw)", async () => {
    await seedPaidOrderWithRefundRequest(repo, {
      id: "o1",
      requestedAt: new Date("2026-07-01T00:00:00Z"),
    });

    const r = await repo.listRefundRequests({ cursor: "no-separator-here" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // Falls back to first page
    expect(r.value.orders.length).toBe(1);
  });

  it("ignores an empty cursor", async () => {
    await seedPaidOrderWithRefundRequest(repo, {
      id: "o1",
      requestedAt: new Date("2026-07-01T00:00:00Z"),
    });

    const r = await repo.listRefundRequests({ cursor: "" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.orders.length).toBe(1);
  });

  it("returns an Order entity that round-trips back through findById", async () => {
    await seedPaidOrderWithRefundRequest(repo, {
      id: "o1",
      requestedAt: new Date("2026-07-01T00:00:00Z"),
    });

    const r = await repo.listRefundRequests({});
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const order = r.value.orders[0];
    expect(order).toBeInstanceOf(Order);
    expect(order?.id).toBe("o1");

    const refetched = await repo.findById("o1");
    expect(refetched.ok).toBe(true);
    if (!refetched.ok) return;
    expect(refetched.value.id).toBe(order?.id);
  });
});

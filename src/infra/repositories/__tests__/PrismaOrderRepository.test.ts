/**
 * PrismaOrderRepository adapter test — P0-2 follow-up.
 *
 * Uses a hand-rolled in-memory PrismaClient fake so the test stays
 * fast and DB-free. The fake implements the same surface the adapter
 * calls: `create`, `findUnique`, `findFirst`, `findMany`, `update`.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { PrismaOrderRepository } from "@/infra/repositories/PrismaOrderRepository";
import { Order } from "@/domain/entities/Order";

interface OrderRow {
  id: string;
  userId: string;
  courseId: string;
  status: string;
  subtotalMinor: number;
  discountMinor: number;
  totalMinor: number;
  currency: string;
  paymongoPaymentId: string | null;
  paymongoCheckoutUrl: string | null;
  paymongoStatus: string | null;
  paymongoPaidAt: Date | null;
  refundReason: string | null;
  refundRequestedAt: Date | null;
  refundProcessedAt: Date | null;
  refundAmountMinor: number | null;
  createdAt: Date;
  updatedAt: Date;
}

class FakePrismaClient {
  rows: OrderRow[] = [];
  failNextCreate = false;
  failNextFind = false;
  failNextUpdate = false;
  private clock = 0;

  /** Monotonic clock so rows created in the same tick still sort deterministically. */
  private tick(): Date {
    this.clock += 1;
    return new Date(this.clock);
  }

  order = {
    create: async (args: { data: Omit<OrderRow, "createdAt" | "updatedAt"> }) => {
      if (this.failNextCreate) {
        this.failNextCreate = false;
        throw new Error("forced create error");
      }
      if (this.rows.some((r) => r.id === args.data.id)) {
        throw new Error("unique constraint violation on id");
      }
      const row: OrderRow = {
        ...args.data,
        createdAt: this.tick(),
        updatedAt: this.tick(),
      };
      this.rows.push(row);
      return row;
    },
    findUnique: async (args: { where: { id?: string; paymongoPaymentId?: string } }) => {
      if (this.failNextFind) {
        this.failNextFind = false;
        throw new Error("forced find error");
      }
      if (args.where.id !== undefined) {
        return this.rows.find((r) => r.id === args.where.id) ?? null;
      }
      if (args.where.paymongoPaymentId !== undefined) {
        return this.rows.find((r) => r.paymongoPaymentId === args.where.paymongoPaymentId) ?? null;
      }
      return null;
    },
    findFirst: async (args: { where: { userId: string; courseId: string; status: string } }) => {
      if (this.failNextFind) {
        this.failNextFind = false;
        throw new Error("forced find error");
      }
      return (
        this.rows.find(
          (r) =>
            r.userId === args.where.userId &&
            r.courseId === args.where.courseId &&
            r.status === args.where.status,
        ) ?? null
      );
    },
    findMany: async (args: { where?: { userId?: string; status?: string } }) => {
      if (this.failNextFind) {
        this.failNextFind = false;
        throw new Error("forced find error");
      }
      let rows = [...this.rows];
      if (args.where?.userId !== undefined) {
        rows = rows.filter((r) => r.userId === args.where!.userId);
      }
      if (args.where?.status !== undefined) {
        rows = rows.filter((r) => r.status === args.where!.status);
      }
      rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return rows;
    },
    update: async (args: { where: { id: string }; data: Partial<OrderRow> }) => {
      if (this.failNextUpdate) {
        this.failNextUpdate = false;
        throw new Error("forced update error");
      }
      const row = this.rows.find((r) => r.id === args.where.id);
      if (!row) {
        const err = new Error("Record not found") as Error & { code: string };
        err.code = "P2025";
        throw err;
      }
      Object.assign(row, args.data, { updatedAt: this.tick() });
      return row;
    },
  };
}

function makeDraftOrder(
  overrides: { id?: string; userId?: string; courseId?: string } = {},
): Order {
  return Order.create({
    id: overrides.id ?? "order_01",
    userId: overrides.userId ?? "user_01",
    courseId: overrides.courseId ?? "course_01",
    subtotalMinor: 299900,
    discountMinor: 0,
    totalMinor: 299900,
    currency: "PHP",
  });
}

describe("PrismaOrderRepository", () => {
  let db: FakePrismaClient;
  let repo: PrismaOrderRepository;

  beforeEach(() => {
    db = new FakePrismaClient();
    repo = new PrismaOrderRepository(db as never);
  });

  // ── create + findById round-trip ─────────────────────────

  it("create persists a DRAFT order and findById round-trips it", async () => {
    const order = makeDraftOrder();
    const createResult = await repo.create(order);
    expect(createResult.ok).toBe(true);
    if (!createResult.ok) return;
    expect(createResult.value.status).toBe("DRAFT");

    const found = await repo.findById(order.id);
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    expect(found.value.id).toBe(order.id);
    expect(found.value.status).toBe("DRAFT");
    expect(found.value.totalMinor).toBe(299900);
  });

  it("findById returns not_found for an unknown id", async () => {
    const result = await repo.findById("ghost");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("not_found");
  });

  // ── update transitions ────────────────────────────────────

  it("update persists a DRAFT → PENDING → PAID transition", async () => {
    const order = makeDraftOrder();
    await repo.create(order);

    order.markPending("cs_test_abc", "https://checkout.paymongo.com/cs_test_abc");
    const pendingUpdate = await repo.update(order);
    expect(pendingUpdate.ok).toBe(true);
    if (!pendingUpdate.ok) return;
    expect(pendingUpdate.value.status).toBe("PENDING");
    expect(pendingUpdate.value.paymongoPaymentId).toBe("cs_test_abc");

    order.markPaid(new Date("2026-07-01T00:00:00Z"));
    const paidUpdate = await repo.update(order);
    expect(paidUpdate.ok).toBe(true);
    if (!paidUpdate.ok) return;
    expect(paidUpdate.value.status).toBe("PAID");
    expect(paidUpdate.value.paymongoStatus).toBe("paid");

    const refetched = await repo.findById(order.id);
    expect(refetched.ok).toBe(true);
    if (!refetched.ok) return;
    expect(refetched.value.status).toBe("PAID");
  });

  it("update returns not_found when the order does not exist", async () => {
    const order = makeDraftOrder({ id: "never-created" });
    const result = await repo.update(order);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("not_found");
  });

  // ── findByPaymongoPaymentId ────────────────────────────────

  it("findByPaymongoPaymentId locates a PENDING order by its checkout session id", async () => {
    const order = makeDraftOrder();
    await repo.create(order);
    order.markPending("cs_lookup_me", "https://checkout.paymongo.com/cs_lookup_me");
    await repo.update(order);

    const found = await repo.findByPaymongoPaymentId("cs_lookup_me");
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    expect(found.value.id).toBe(order.id);
  });

  it("findByPaymongoPaymentId returns not_found when unmatched", async () => {
    const result = await repo.findByPaymongoPaymentId("cs_never_issued");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("not_found");
  });

  // ── findByUserId ───────────────────────────────────────────

  it("findByUserId returns only that user's orders", async () => {
    await repo.create(makeDraftOrder({ id: "o1", userId: "user_a" }));
    await repo.create(makeDraftOrder({ id: "o2", userId: "user_a" }));
    await repo.create(makeDraftOrder({ id: "o3", userId: "user_b" }));

    const result = await repo.findByUserId("user_a");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.map((o) => o.id).sort()).toEqual(["o1", "o2"]);
  });

  // ── listAll ────────────────────────────────────────────────

  it("listAll returns every order sorted newest-first when unfiltered", async () => {
    const o1 = makeDraftOrder({ id: "o1" });
    await repo.create(o1);
    const o2 = makeDraftOrder({ id: "o2" });
    await repo.create(o2);

    const result = await repo.listAll();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.map((o) => o.id)).toEqual(["o2", "o1"]);
  });

  it("listAll filters by status", async () => {
    const paid = makeDraftOrder({ id: "paid-1" });
    await repo.create(paid);
    paid.markPending("cs_1", "https://x");
    await repo.update(paid);
    paid.markPaid();
    await repo.update(paid);

    const draft = makeDraftOrder({ id: "draft-1" });
    await repo.create(draft);

    const result = await repo.listAll({ status: "PAID" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.map((o) => o.id)).toEqual(["paid-1"]);
  });

  // ── findPaidForUserAndCourse (P0-1 paywall check) ──────────

  it("findPaidForUserAndCourse returns the PAID order for that user + course", async () => {
    const order = makeDraftOrder({ id: "paid-order", userId: "user_x", courseId: "course_x" });
    await repo.create(order);
    order.markPending("cs_1", "https://x");
    await repo.update(order);
    order.markPaid();
    await repo.update(order);

    const result = await repo.findPaidForUserAndCourse("user_x", "course_x");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value?.id).toBe("paid-order");
  });

  it("findPaidForUserAndCourse returns null when no PAID order exists", async () => {
    await repo.create(makeDraftOrder({ id: "draft-only", userId: "user_y", courseId: "course_y" }));

    const result = await repo.findPaidForUserAndCourse("user_y", "course_y");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBeNull();
  });

  // ── error mapping ──────────────────────────────────────────

  it("create returns db_error when Prisma throws", async () => {
    db.failNextCreate = true;
    const result = await repo.create(makeDraftOrder());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });

  it("findById returns db_error when Prisma throws", async () => {
    db.failNextFind = true;
    const result = await repo.findById("any");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });

  it("update returns db_error when Prisma throws a non-P2025 error", async () => {
    const order = makeDraftOrder();
    await repo.create(order);
    db.failNextUpdate = true;
    const result = await repo.update(order);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });
});

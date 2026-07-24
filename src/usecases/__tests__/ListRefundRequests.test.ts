/**
 * ListRefundRequests.test.ts — STORY-062 TDD.
 *
 * The use case is a thin pass-through to the repo + user lookup.
 * Tests verify:
 * - pass-through of status / cursor / limit
 * - user-email search filters orders and populates the users map
 * - empty user map when no search
 * - error propagation from orderRepo and userRepo
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ListRefundRequests } from "@/usecases/ListRefundRequests";
import { InMemoryOrderRepository } from "@/infra/payment/InMemoryOrderRepository";
import { InMemoryUserRepository } from "@/infra/repositories/InMemoryUserRepository";

describe("ListRefundRequests", () => {
  let orderRepo: InMemoryOrderRepository;
  let userRepo: InMemoryUserRepository;
  let useCase: ListRefundRequests;

  beforeEach(() => {
    orderRepo = new InMemoryOrderRepository();
    userRepo = new InMemoryUserRepository();
    useCase = new ListRefundRequests({ orderRepo, userRepo });
  });

  async function seedUser(id: string, email: string): Promise<void> {
    await userRepo.create({
      id,
      email,
      passwordHash: "h",
      firstName: "F",
      lastName: "L",
    });
  }

  async function seedPaidOrderWithRefundRequest(
    id: string,
    userId: string,
    courseId: string,
    requestedAt: Date,
  ): Promise<void> {
    await orderRepo.seedPaidOrder({ id, userId, courseId });
    const r = await orderRepo.findById(id);
    if (!r.ok) throw new Error("seed failed");
    r.value.refundRequestedAt = requestedAt;
    r.value.refundReason = "I changed my mind";
  }

  it("returns empty page when there are no refund requests", async () => {
    await seedUser("u1", "a@example.com");
    await orderRepo.seedPaidOrder({ id: "o1", userId: "u1", courseId: "c1" });

    const r = await useCase.execute({});
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.orders).toEqual([]);
    expect(r.value.total).toBe(0);
    expect(r.value.nextCursor).toBeNull();
    expect(r.value.users.size).toBe(0);
  });

  it("returns only orders with refundRequestedAt set", async () => {
    await seedUser("u1", "a@example.com");
    await orderRepo.seedPaidOrder({ id: "o1", userId: "u1", courseId: "c1" });
    await seedPaidOrderWithRefundRequest("o2", "u1", "c1", new Date("2026-07-01T00:00:00Z"));

    const r = await useCase.execute({});
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.orders.length).toBe(1);
    expect(r.value.orders[0]?.id).toBe("o2");
    expect(r.value.total).toBe(1);
  });

  it("filters by status=pending (excludes already-processed)", async () => {
    await seedUser("u1", "a@example.com");
    await orderRepo.seedPaidOrder({ id: "o1", userId: "u1", courseId: "c1" });
    await seedPaidOrderWithRefundRequest("o2", "u1", "c1", new Date("2026-07-01T00:00:00Z"));
    // Mark o2 as processed (refundProcessedAt set)
    const r2 = await orderRepo.findById("o2");
    if (r2.ok) {
      r2.value.refundProcessedAt = new Date("2026-07-02T00:00:00Z");
      r2.value.refundAmountMinor = 1000;
      r2.value.status = "REFUNDED";
    }

    const r = await useCase.execute({ status: "pending" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.orders).toEqual([]);
  });

  it("filters by status=processed (excludes pending)", async () => {
    await seedUser("u1", "a@example.com");
    await seedPaidOrderWithRefundRequest("o1", "u1", "c1", new Date("2026-07-01T00:00:00Z"));
    const r1 = await orderRepo.findById("o1");
    if (r1.ok) {
      r1.value.refundProcessedAt = new Date("2026-07-02T00:00:00Z");
      r1.value.refundAmountMinor = 1000;
      r1.value.status = "REFUNDED";
    }
    await seedPaidOrderWithRefundRequest("o2", "u1", "c1", new Date("2026-07-03T00:00:00Z"));

    const r = await useCase.execute({ status: "processed" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.orders.length).toBe(1);
    expect(r.value.orders[0]?.id).toBe("o1");
  });

  it("filters by userEmailSearch (case-insensitive)", async () => {
    await seedUser("u1", "alice@example.com");
    await seedUser("u2", "bob@example.com");
    await seedPaidOrderWithRefundRequest("o1", "u1", "c1", new Date("2026-07-01T00:00:00Z"));
    await seedPaidOrderWithRefundRequest("o2", "u2", "c1", new Date("2026-07-02T00:00:00Z"));

    const r = await useCase.execute({ userEmailSearch: "ALICE" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.orders.length).toBe(1);
    expect(r.value.orders[0]?.id).toBe("o1");
    expect(r.value.users.size).toBe(1);
    expect(r.value.users.get("u1")?.email).toBe("alice@example.com");
  });

  it("orders are sorted by refundRequestedAt desc", async () => {
    await seedUser("u1", "a@example.com");
    await seedPaidOrderWithRefundRequest("o1", "u1", "c1", new Date("2026-07-01T00:00:00Z"));
    await seedPaidOrderWithRefundRequest("o2", "u1", "c1", new Date("2026-07-03T00:00:00Z"));
    await seedPaidOrderWithRefundRequest("o3", "u1", "c1", new Date("2026-07-02T00:00:00Z"));

    const r = await useCase.execute({});
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.orders.map((o) => o.id)).toEqual(["o2", "o3", "o1"]);
  });

  it("passes cursor + limit through to the repo", async () => {
    await seedUser("u1", "a@example.com");
    await seedPaidOrderWithRefundRequest("o1", "u1", "c1", new Date("2026-07-01T00:00:00Z"));

    let receivedArgs: unknown = null;
    const orig = orderRepo.listRefundRequests.bind(orderRepo);
    orderRepo.listRefundRequests = async (args) => {
      receivedArgs = args;
      return orig(args);
    };

    await useCase.execute({ cursor: "abc", limit: 25 });

    expect(receivedArgs).toMatchObject({ cursor: "abc", limit: 25 });
  });

  it("propagates db_error from the order repo", async () => {
    orderRepo.listRefundRequests = async () => ({
      ok: false,
      error: { kind: "db_error", message: "boom" },
    });

    const r = await useCase.execute({});
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
  });

  it("returns user_error when the user repo errors during email search", async () => {
    await seedUser("u1", "alice@example.com");
    await seedPaidOrderWithRefundRequest("o1", "u1", "c1", new Date("2026-07-01T00:00:00Z"));

    userRepo.findById = async () => ({
      ok: false,
      error: { kind: "db_error", message: "user lookup failed" },
    });

    const r = await useCase.execute({ userEmailSearch: "alice" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("user_error");
  });
});

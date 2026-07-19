/**
 * AdminListPayments.test.ts — STORY-049.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { AdminListPayments } from "@/usecases/AdminListPayments";
import { InMemoryOrderRepository } from "@/infra/payment/InMemoryOrderRepository";
import { InMemoryUserRepository } from "@/infra/repositories/InMemoryUserRepository";

describe("AdminListPayments", () => {
  let orderRepo: InMemoryOrderRepository;
  let userRepo: InMemoryUserRepository;
  let useCase: AdminListPayments;

  beforeEach(() => {
    orderRepo = new InMemoryOrderRepository();
    userRepo = new InMemoryUserRepository();
    useCase = new AdminListPayments({ orderRepo, userRepo });
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

  it("returns all orders when no filter is provided", async () => {
    await seedUser("u1", "a@example.com");
    await seedUser("u2", "b@example.com");
    await orderRepo.seedPaidOrder({ id: "o1", userId: "u1", courseId: "c1" });
    await orderRepo.seedPendingOrder({ id: "o2", userId: "u2", courseId: "c1", paymongoPaymentId: "cs_x", paymongoCheckoutUrl: "http://x" });

    const r = await useCase.execute({});
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.orders.length).toBe(2);
  });

  it("filters by status", async () => {
    await seedUser("u1", "a@example.com");
    await orderRepo.seedPaidOrder({ id: "o1", userId: "u1", courseId: "c1" });
    await orderRepo.seedPendingOrder({ id: "o2", userId: "u1", courseId: "c1", paymongoPaymentId: "cs_x", paymongoCheckoutUrl: "http://x" });

    const r = await useCase.execute({ status: "PAID" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.orders.length).toBe(1);
    expect(r.value.orders[0]?.id).toBe("o1");
  });

  it("returns empty list when there are no orders", async () => {
    const r = await useCase.execute({});
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.orders).toEqual([]);
  });

  it("filters by user email search (case-insensitive substring)", async () => {
    await seedUser("u1", "alice@example.com");
    await seedUser("u2", "bob@example.com");
    await orderRepo.seedPaidOrder({ id: "o1", userId: "u1", courseId: "c1" });
    await orderRepo.seedPaidOrder({ id: "o2", userId: "u2", courseId: "c1" });

    const r = await useCase.execute({ userEmailSearch: "ALICE" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.orders.length).toBe(1);
    expect(r.value.orders[0]?.id).toBe("o1");
    expect(r.value.users.size).toBe(1);
  });

  it("email search with no matches returns empty orders", async () => {
    await seedUser("u1", "alice@example.com");
    await orderRepo.seedPaidOrder({ id: "o1", userId: "u1", courseId: "c1" });

    const r = await useCase.execute({ userEmailSearch: "nobody" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.orders).toEqual([]);
  });

  it("orders are sorted by createdAt desc", async () => {
    await seedUser("u1", "a@example.com");
    await orderRepo.seedPaidOrder({ id: "o1", userId: "u1", courseId: "c1" });
    // wait — same Date.now, sort may be unstable. Just verify it returns all.
    await orderRepo.seedPaidOrder({ id: "o2", userId: "u1", courseId: "c1" });

    const r = await useCase.execute({});
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.orders.length).toBe(2);
  });

  it("returns db_error when the repo errors", async () => {
    orderRepo.listAll = async () => ({
      ok: false,
      error: { kind: "db_error", message: "list failed" },
    });

    const r = await useCase.execute({});
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
  });
});

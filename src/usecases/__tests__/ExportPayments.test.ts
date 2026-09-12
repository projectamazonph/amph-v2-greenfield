import { describe, it, expect, beforeEach } from "vitest";
import { ExportPayments } from "@/usecases/ExportPayments";
import { InMemoryOrderRepository } from "@/infra/payment/InMemoryOrderRepository";
import { InMemoryUserRepository } from "@/infra/repositories/InMemoryUserRepository";

describe("ExportPayments", () => {
  let orderRepo: InMemoryOrderRepository;
  let userRepo: InMemoryUserRepository;
  let useCase: ExportPayments;

  beforeEach(async () => {
    orderRepo = new InMemoryOrderRepository();
    userRepo = new InMemoryUserRepository();

    await userRepo.create({
      id: "u1",
      email: "alice@example.com",
      passwordHash: "h",
      firstName: "Alice",
      lastName: "A",
    });
    await userRepo.create({
      id: "u2",
      email: "bob@example.com",
      passwordHash: "h",
      firstName: "Bob",
      lastName: "B",
    });

    await orderRepo.seedPaidOrder({ id: "o1", userId: "u1", courseId: "c1" });
    await orderRepo.seedPaidOrder({ id: "o2", userId: "u2", courseId: "c1" });
    await orderRepo.seedPendingOrder({
      id: "o3",
      userId: "u1",
      courseId: "c1",
      paymongoPaymentId: "cs_x",
      paymongoCheckoutUrl: "http://x",
    });

    useCase = new ExportPayments({ orderRepo, userRepo });
  });

  it("returns all orders enriched with user emails", async () => {
    const result = await useCase.execute({});
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toHaveLength(3);
    expect(result.rows[0]).toMatchObject({
      id: "o1",
      userEmail: "alice@example.com",
      status: "PAID",
    });
    expect(result.rows[1]).toMatchObject({
      id: "o2",
      userEmail: "bob@example.com",
    });
  });

  it("respects maxEntries", async () => {
    const result = await useCase.execute({ maxEntries: 2 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toHaveLength(2);
  });

  it("includes ISO createdAt on each row", async () => {
    const result = await useCase.execute({});
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(typeof result.rows[0].createdAt).toBe("string");
    expect(result.rows[0].createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

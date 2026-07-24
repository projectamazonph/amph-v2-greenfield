import { Result } from "@/domain/shared/Result";
import { Order, OrderCreateParams } from "@/domain/entities/Order";
import type { IOrderRepository, OrderError } from "@/ports/repositories/OrderRepository";
import type { PaymentStatus } from "@/domain/values/PaymentStatus";

export class InMemoryOrderRepository implements IOrderRepository {
  /** Exposed for tests — do not use in production. */
  orders = new Map<string, Order>();

  async create(order: Order): Promise<Result<Order, OrderError>> {
    this.orders.set(order.id, order);
    return Result.ok(order);
  }

  async findById(id: string): Promise<Result<Order, OrderError>> {
    const order = this.orders.get(id);
    if (!order) return Result.err({ kind: "not_found" });
    return Result.ok(order);
  }

  async findByPaymongoPaymentId(paymongoPaymentId: string): Promise<Result<Order, OrderError>> {
    for (const order of this.orders.values()) {
      if (order.paymongoPaymentId === paymongoPaymentId) {
        return Result.ok(order);
      }
    }
    return Result.err({ kind: "not_found" });
  }

  async findByUserId(userId: string): Promise<Result<Order[], OrderError>> {
    const orders = Array.from(this.orders.values()).filter((o) => o.userId === userId);
    return Result.ok(orders);
  }

  async listAll(filters?: { status?: PaymentStatus }): Promise<Result<Order[], OrderError>> {
    let orders = Array.from(this.orders.values());
    if (filters?.status) {
      orders = orders.filter((o) => o.status === filters.status);
    }
    orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return Result.ok(orders);
  }

  // STORY-062: admin list of refund requests (orders with refundRequestedAt set)
  async listRefundRequests(filters: {
    status?: "pending" | "processed";
    cursor?: string;
    limit?: number;
  }): Promise<
    Result<{ orders: readonly Order[]; nextCursor: string | null; total: number }, OrderError>
  > {
    const limit = Math.min(filters.limit ?? 50, 100);

    // Decode cursor: "{refundRequestedAt.toISOString()}::{id}"
    let cursorMs: number | null = null;
    let cursorId: string | null = null;
    if (filters.cursor) {
      const sepIdx = filters.cursor.indexOf("::");
      if (sepIdx > 0) {
        const ts = filters.cursor.slice(0, sepIdx);
        cursorId = filters.cursor.slice(sepIdx + 2);
        cursorMs = new Date(ts).getTime();
      }
    }

    // Filter: only orders with a refund request
    let filtered = Array.from(this.orders.values()).filter((o) => {
      if (o.refundRequestedAt === null) return false;
      if (filters.status === "pending" && o.refundProcessedAt !== null) return false;
      if (filters.status === "processed" && o.refundProcessedAt === null) return false;
      return true;
    });

    // Sort: refundRequestedAt desc, id desc (matches Prisma compound-cursor order)
    filtered.sort((a, b) => {
      const aMs = a.refundRequestedAt?.getTime() ?? 0;
      const bMs = b.refundRequestedAt?.getTime() ?? 0;
      const timeCmp = bMs - aMs;
      if (timeCmp !== 0) return timeCmp;
      return b.id.localeCompare(a.id);
    });

    const total = filtered.length;

    // Apply cursor skip (exclude rows at/after the cursor position)
    if (cursorMs !== null && cursorId !== null) {
      filtered = filtered.filter((o) => {
        const oMs = o.refundRequestedAt?.getTime() ?? 0;
        if (oMs < cursorMs!) return true;
        if (oMs > cursorMs!) return false;
        // Same millisecond — desc sort, exclude entries with id >= cursorId
        return o.id.localeCompare(cursorId!) < 0;
      });
    }

    const page = filtered.slice(0, limit);

    let nextCursor: string | null = null;
    if (page.length === limit && filtered.length > limit) {
      const last = page[page.length - 1];
      if (last && last.refundRequestedAt) {
        nextCursor = `${last.refundRequestedAt.toISOString()}::${last.id}`;
      }
    }

    return Result.ok({ orders: page, nextCursor, total });
  }

  async update(order: Order): Promise<Result<Order, OrderError>> {
    this.orders.set(order.id, order);
    return Result.ok(order);
  }

  // P0-1: paywall check
  async findPaidForUserAndCourse(
    userId: string,
    courseId: string,
  ): Promise<Result<Order | null, OrderError>> {
    for (const order of this.orders.values()) {
      if (order.userId === userId && order.courseId === courseId && order.status === "PAID") {
        return Result.ok(order);
      }
    }
    return Result.ok(null);
  }

  // ── Test helpers ──────────────────────────────────────────

  getAll(): Order[] {
    return Array.from(this.orders.values());
  }

  clear(): void {
    this.orders.clear();
  }

  /** Seed a PAID order directly (used in already_enrolled tests) */
  async seedPaidOrder(params: {
    id: string;
    userId: string;
    courseId: string;
    totalMinor?: number;
    paymongoPaymentId?: string;
  }): Promise<void> {
    const total = params.totalMinor ?? 299900;
    const order = Order.create({
      id: params.id,
      userId: params.userId,
      courseId: params.courseId,
      subtotalMinor: total,
      discountMinor: 0,
      totalMinor: total,
      currency: "PHP",
    });
    order.markPending(
      params.paymongoPaymentId ?? "cs_paid",
      "https://checkout.paymongo.com/cs_paid",
    );
    order.markPaid();
    this.orders.set(order.id, order);
  }

  /** Seed a PENDING order with existing checkout URL */
  async seedPendingOrder(params: {
    id: string;
    userId: string;
    courseId: string;
    paymongoPaymentId: string;
    paymongoCheckoutUrl: string;
    totalMinor?: number;
  }): Promise<void> {
    const order = Order.create({
      id: params.id,
      userId: params.userId,
      courseId: params.courseId,
      subtotalMinor: params.totalMinor ?? 299900,
      discountMinor: 0,
      totalMinor: params.totalMinor ?? 299900,
      currency: "PHP",
    });
    order.markPending(params.paymongoPaymentId, params.paymongoCheckoutUrl);
    this.orders.set(order.id, order);
  }

  /** Seed a FAILED order */
  async seedFailedOrder(params: {
    id: string;
    userId: string;
    courseId: string;
    totalMinor?: number;
  }): Promise<void> {
    const order = Order.create({
      id: params.id,
      userId: params.userId,
      courseId: params.courseId,
      subtotalMinor: params.totalMinor ?? 299900,
      discountMinor: 0,
      totalMinor: params.totalMinor ?? 299900,
      currency: "PHP",
    });
    order.markPending("cs_failed", "https://checkout.paymongo.com/cs_failed");
    order.markFailed();
    this.orders.set(order.id, order);
  }

  /** Seed an EXPIRED order */
  async seedExpiredOrder(params: {
    id: string;
    userId: string;
    courseId: string;
    totalMinor?: number;
  }): Promise<void> {
    const order = Order.create({
      id: params.id,
      userId: params.userId,
      courseId: params.courseId,
      subtotalMinor: params.totalMinor ?? 299900,
      discountMinor: 0,
      totalMinor: params.totalMinor ?? 299900,
      currency: "PHP",
    });
    order.markPending("cs_expired", "https://checkout.paymongo.com/cs_expired");
    order.markExpired();
    this.orders.set(order.id, order);
  }
}

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
    const orders = Array.from(this.orders.values()).filter(o => o.userId === userId);
    return Result.ok(orders);
  }

  async listAll(filters?: {
    status?: PaymentStatus;
  }): Promise<Result<Order[], OrderError>> {
    let orders = Array.from(this.orders.values());
    if (filters?.status) {
      orders = orders.filter((o) => o.status === filters.status);
    }
    orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return Result.ok(orders);
  }

  async update(order: Order): Promise<Result<Order, OrderError>> {
    this.orders.set(order.id, order);
    return Result.ok(order);
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
    order.markPending(params.paymongoPaymentId ?? "cs_paid", "https://checkout.paymongo.com/cs_paid");
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

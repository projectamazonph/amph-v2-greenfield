/**
 * OrderRepository — port for persisting and querying Order entities.
 *
 * Implementation: src/infra/repositories/PrismaOrderRepository.ts
 * Tests:          src/infra/payment/InMemoryOrderRepository.ts
 */

import type { Result } from "@/domain/shared/Result";
import type { Order } from "@/domain/entities/Order";
import type { PaymentStatus } from "@/domain/values/PaymentStatus";

export type OrderError = { kind: "not_found" } | { kind: "db_error"; message: string };

export interface IOrderRepository {
  create(order: Order): Promise<Result<Order, OrderError>>;
  findById(id: string): Promise<Result<Order, OrderError>>;

  /**
   * Find an order by its PayMongo Checkout Session ID.
   * Used by the webhook handler to look up the order.
   */
  findByPaymongoPaymentId(paymongoPaymentId: string): Promise<Result<Order, OrderError>>;

  /** Find all orders for a given user. */
  findByUserId(userId: string): Promise<Result<Order[], OrderError>>;

  /**
   * STORY-049: admin list view of all orders, sorted by createdAt desc.
   * Optionally filter by status. The user-email search happens in the
   * use case layer (it joins against userRepo), not here.
   */
  listAll(filters?: { status?: PaymentStatus }): Promise<Result<Order[], OrderError>>;

  /**
   * STORY-062: admin list view of refund requests.
   *
   * A "refund request" is any order with `refundRequestedAt IS NOT NULL`.
   * Filter by `status` to distinguish pending (no `refundProcessedAt`)
   * from processed (`refundProcessedAt IS NOT NULL`).
   *
   * The user-email search and the join against userRepo happen in the
   * use case layer, not here. The repo returns the bare order list;
   * the use case enriches with user info on the way out.
   *
   * Cursor pagination, ordered by `refundRequestedAt` desc with `id`
   * as the tiebreaker (same compound-cursor pattern as the audit log
   * list — `{refundRequestedAt.toISOString()}::{id}`).
   */
  listRefundRequests(filters: {
    status?: "pending" | "processed";
    cursor?: string;
    limit?: number;
  }): Promise<
    Result<{ orders: readonly Order[]; nextCursor: string | null; total: number }, OrderError>
  >;

  /** Persist changes to an existing order. */
  update(order: Order): Promise<Result<Order, OrderError>>;

  /**
   * STORY-P0-1 (paywall): find a PAID order for a given user + course.
   * Returns null if no such order exists. Used by the enroll use case
   * to verify that a paid course has actually been paid for.
   */
  findPaidForUserAndCourse(
    userId: string,
    courseId: string,
  ): Promise<Result<Order | null, OrderError>>;
}

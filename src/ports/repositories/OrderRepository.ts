/**
 * OrderRepository — port for persisting and querying Order entities.
 *
 * Implementation: src/infra/repositories/PrismaOrderRepository.ts
 * Tests:          src/infra/payment/InMemoryOrderRepository.ts
 */

import type { Result } from "@/domain/shared/Result";
import type { Order } from "@/domain/entities/Order";
import type { PaymentStatus } from "@/domain/values/PaymentStatus";

export type OrderError =
  | { kind: "not_found" }
  | { kind: "db_error"; message: string };

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
  listAll(filters?: {
    status?: PaymentStatus;
  }): Promise<Result<Order[], OrderError>>;

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

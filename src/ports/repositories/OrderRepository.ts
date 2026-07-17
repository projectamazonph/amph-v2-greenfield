/**
 * OrderRepository — port for persisting and querying Order entities.
 *
 * Implementation: src/infra/repositories/PrismaOrderRepository.ts
 * Tests:          src/infra/payment/InMemoryOrderRepository.ts
 */

import type { Result } from "@/domain/shared/Result";
import type { Order } from "@/domain/entities/Order";

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

  /** Persist changes to an existing order. */
  update(order: Order): Promise<Result<Order, OrderError>>;
}

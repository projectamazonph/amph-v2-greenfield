/**
 * PrismaOrderRepository — production adapter for IOrderRepository.
 *
 * P0-2 follow-up: orders (and the money that flows through them) were
 * previously in-process only (InMemoryOrderRepository), so every order
 * vanished on cold start / redeploy and a webhook hitting a different
 * serverless instance could never find the order it needed to mark PAID.
 * This adapter persists orders to PostgreSQL so checkout, the PayMongo
 * webhook, and refunds all observe the same order state.
 *
 * The `status` column (added in migration 20260722000000_order_status)
 * carries the domain `PaymentStatus` state machine directly — it is
 * distinct from `paymongoStatus`, which is PayMongo's own vocabulary and
 * has no "DRAFT" equivalent (an order is DRAFT before a checkout session
 * exists at all).
 */

import { PrismaClient } from "@prisma/client";
import { Result } from "@/domain/shared/Result";
import { Order } from "@/domain/entities/Order";
import type { IOrderRepository, OrderError } from "@/ports/repositories/OrderRepository";
import { PaymentStatus } from "@/domain/values/PaymentStatus";

interface PrismaOrderRow {
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

export class PrismaOrderRepository implements IOrderRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(order: Order): Promise<Result<Order, OrderError>> {
    try {
      const row = await this.db.order.create({
        data: {
          id: order.id,
          userId: order.userId,
          courseId: order.courseId,
          status: order.status,
          subtotalMinor: order.subtotalMinor,
          discountMinor: order.discountMinor,
          totalMinor: order.totalMinor,
          currency: order.currency,
          paymongoPaymentId: order.paymongoPaymentId,
          paymongoCheckoutUrl: order.paymongoCheckoutUrl,
          paymongoStatus: order.paymongoStatus,
          paymongoPaidAt: order.paymongoPaidAt,
          refundReason: order.refundReason,
          refundRequestedAt: order.refundRequestedAt,
          refundProcessedAt: order.refundProcessedAt,
          refundAmountMinor: order.refundAmountMinor,
        },
      });
      return Result.ok(this.mapRow(row));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async findById(id: string): Promise<Result<Order, OrderError>> {
    try {
      const row = await this.db.order.findUnique({ where: { id } });
      if (!row) return Result.err({ kind: "not_found" });
      return Result.ok(this.mapRow(row));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async findByPaymongoPaymentId(paymongoPaymentId: string): Promise<Result<Order, OrderError>> {
    try {
      const row = await this.db.order.findUnique({ where: { paymongoPaymentId } });
      if (!row) return Result.err({ kind: "not_found" });
      return Result.ok(this.mapRow(row));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async findByUserId(userId: string): Promise<Result<Order[], OrderError>> {
    try {
      const rows = await this.db.order.findMany({ where: { userId } });
      return Result.ok(rows.map((r) => this.mapRow(r)));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async listAll(filters?: { status?: PaymentStatus }): Promise<Result<Order[], OrderError>> {
    try {
      const rows = await this.db.order.findMany({
        where: filters?.status ? { status: filters.status } : undefined,
        orderBy: { createdAt: "desc" },
      });
      return Result.ok(rows.map((r) => this.mapRow(r)));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async update(order: Order): Promise<Result<Order, OrderError>> {
    try {
      const row = await this.db.order.update({
        where: { id: order.id },
        data: {
          status: order.status,
          paymongoPaymentId: order.paymongoPaymentId,
          paymongoCheckoutUrl: order.paymongoCheckoutUrl,
          paymongoStatus: order.paymongoStatus,
          paymongoPaidAt: order.paymongoPaidAt,
          refundReason: order.refundReason,
          refundRequestedAt: order.refundRequestedAt,
          refundProcessedAt: order.refundProcessedAt,
          refundAmountMinor: order.refundAmountMinor,
        },
      });
      return Result.ok(this.mapRow(row));
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code: string }).code === "P2025"
      ) {
        return Result.err({ kind: "not_found" });
      }
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async findPaidForUserAndCourse(
    userId: string,
    courseId: string,
  ): Promise<Result<Order | null, OrderError>> {
    try {
      const row = await this.db.order.findFirst({
        where: { userId, courseId, status: "PAID" satisfies PaymentStatus },
      });
      return Result.ok(row ? this.mapRow(row) : null);
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  private mapRow(row: PrismaOrderRow): Order {
    if (!PaymentStatus.isValid(row.status)) {
      // Caught by the surrounding try/catch in every caller and
      // turned into a db_error — a corrupt or legacy status value
      // must not silently hydrate an Order that bypasses the
      // entity's mark*() transition guards.
      throw new Error(`Order ${row.id} has an invalid persisted status: "${row.status}"`);
    }
    return Order.hydrate({
      id: row.id,
      userId: row.userId,
      courseId: row.courseId,
      status: row.status,
      subtotalMinor: row.subtotalMinor,
      discountMinor: row.discountMinor,
      totalMinor: row.totalMinor,
      currency: row.currency,
      paymongoPaymentId: row.paymongoPaymentId,
      paymongoCheckoutUrl: row.paymongoCheckoutUrl,
      paymongoStatus: row.paymongoStatus,
      paymongoPaidAt: row.paymongoPaidAt,
      refundReason: row.refundReason,
      refundRequestedAt: row.refundRequestedAt,
      refundProcessedAt: row.refundProcessedAt,
      refundAmountMinor: row.refundAmountMinor,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}

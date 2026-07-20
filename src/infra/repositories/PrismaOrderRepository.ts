/**
 * PrismaOrderRepository — production adapter for IOrderRepository.
 *
 * Persists Order entities to PostgreSQL via Prisma. The Order domain
 * entity is the source of truth; this adapter translates between the
 * domain model and the Prisma row shape.
 *
 * Key mappings:
 *   domain Order.status (PaymentStatus) ↔ db paymongoStatus (String)
 *   domain Order is immutable post-creation except for status transitions
 *     and refund fields — we call order.markPaid() etc. in the webhook
 *     handler before calling repo.update(), so the domain model state
 *     is always current when we serialize.
 */

import { PrismaClient, Prisma } from "@prisma/client";
import { Result } from "@/domain/shared/Result";
import type { IOrderRepository, OrderError } from "@/ports/repositories/OrderRepository";
import type { Order } from "@/domain/entities/Order";
import type { PaymentStatus } from "@/domain/values/PaymentStatus";
import { PaymentStatus as PaymentStatusValues } from "@/domain/values/PaymentStatus";

interface PrismaOrderRow {
  id: string;
  userId: string;
  courseId: string;
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
  receiptNumber: string | null;
  manuallySetBy: string | null;
  manuallySetReason: string | null;
  manuallySetAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Map a Prisma row back to a live Order domain entity.
 *
 * We reconstruct the entity using the factory + public setter fields.
 * State transitions are replayed via the public markPending/markPaid/etc.
 * methods so the entity's internal state machine is consistent.
 */
function mapRowToDomain(row: PrismaOrderRow): Order {
  // Use the domain factory — Order.create() is the only supported constructor

  const { Order: OrderClass } = require("@/domain/entities/Order") as {
    Order: typeof import("@/domain/entities/Order").Order;
  };

  // Reconstruct via factory
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params: any = {
    id: row.id,
    userId: row.userId,
    courseId: row.courseId,
    subtotalMinor: row.subtotalMinor,
    discountMinor: row.discountMinor,
    totalMinor: row.totalMinor,
    currency: row.currency,
  };

  const order = OrderClass.create(params);

  // Replay state transitions based on stored paymongoStatus
  const pStatus = row.paymongoStatus ?? "pending";
  if (pStatus === "paid" && row.paymongoPaidAt) {
    order.paymongoPaymentId = row.paymongoPaymentId;
    order.paymongoCheckoutUrl = row.paymongoCheckoutUrl;
    order.status = "PAID";
    order.paymongoStatus = "paid";
    order.paymongoPaidAt = row.paymongoPaidAt;
    order.updatedAt = row.updatedAt;
  } else if (pStatus === "failed") {
    order.paymongoPaymentId = row.paymongoPaymentId;
    order.paymongoCheckoutUrl = row.paymongoCheckoutUrl;
    order.status = "FAILED";
    order.paymongoStatus = "failed";
    order.updatedAt = row.updatedAt;
  } else if (pStatus === "expired") {
    order.paymongoPaymentId = row.paymongoPaymentId;
    order.paymongoCheckoutUrl = row.paymongoCheckoutUrl;
    order.status = "EXPIRED";
    order.paymongoStatus = "expired";
    order.updatedAt = row.updatedAt;
  } else if (pStatus === "refunded") {
    order.paymongoPaymentId = row.paymongoPaymentId;
    order.paymongoCheckoutUrl = row.paymongoCheckoutUrl;
    order.status = "REFUNDED";
    order.paymongoStatus = "refunded";
    order.paymongoPaidAt = row.paymongoPaidAt;
    order.refundReason = row.refundReason;
    order.refundProcessedAt = row.refundProcessedAt;
    order.refundAmountMinor = row.refundAmountMinor;
    order.updatedAt = row.updatedAt;
  } else if (pStatus === "pending" && row.paymongoPaymentId) {
    order.paymongoPaymentId = row.paymongoPaymentId;
    order.paymongoCheckoutUrl = row.paymongoCheckoutUrl;
    order.status = "PENDING";
    order.paymongoStatus = "pending";
    order.updatedAt = row.updatedAt;
  }
  // DRAFT orders have paymongoPaymentId === null; leave status as DRAFT.

  // Refund fields
  if (row.refundReason) order.refundReason = row.refundReason;
  if (row.refundRequestedAt) order.refundRequestedAt = row.refundRequestedAt;
  if (row.refundProcessedAt) order.refundProcessedAt = row.refundProcessedAt;
  if (row.refundAmountMinor !== null) order.refundAmountMinor = row.refundAmountMinor;

  // Manual override fields
  if (row.manuallySetBy) order.manuallySetBy = row.manuallySetBy;
  if (row.manuallySetReason) order.manuallySetReason = row.manuallySetReason;
  if (row.manuallySetAt) order.manuallySetAt = row.manuallySetAt;

  // Receipt
  if (row.receiptNumber) order.receiptNumber = row.receiptNumber;

  return order;
}

/**
 * Map a domain Order entity to a Prisma create/update shape.
 */
function mapDomainToPrisma(order: Order) {
  return {
    id: order.id,
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
    receiptNumber: order.receiptNumber,
    manuallySetBy: order.manuallySetBy,
    manuallySetReason: order.manuallySetReason,
    manuallySetAt: order.manuallySetAt,
    updatedAt: order.updatedAt,
  };
}

export class PrismaOrderRepository implements IOrderRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(order: Order): Promise<Result<Order, OrderError>> {
    try {
      await this.db.order.create({
        data: {
          ...mapDomainToPrisma(order),
          userId: order.userId,
          courseId: order.courseId,
        },
      });
      return Result.ok(order);
    } catch (err) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async findById(id: string): Promise<Result<Order, OrderError>> {
    try {
      const row = await this.db.order.findUnique({ where: { id } });
      if (!row) return Result.err({ kind: "not_found" });
      return Result.ok(mapRowToDomain(row as PrismaOrderRow));
    } catch (err) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async findByPaymongoPaymentId(paymongoPaymentId: string): Promise<Result<Order, OrderError>> {
    try {
      const row = await this.db.order.findUnique({ where: { paymongoPaymentId } });
      if (!row) return Result.err({ kind: "not_found" });
      return Result.ok(mapRowToDomain(row as PrismaOrderRow));
    } catch (err) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async findByUserId(userId: string): Promise<Result<Order[], OrderError>> {
    try {
      const rows = await this.db.order.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
      return Result.ok(rows.map((r) => mapRowToDomain(r as PrismaOrderRow)));
    } catch (err) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async listAll(filters?: { status?: PaymentStatus }): Promise<Result<Order[], OrderError>> {
    try {
      // Map domain PaymentStatus to db paymongoStatus string
      const where: Prisma.OrderWhereInput = {};
      if (filters?.status) {
        // Only terminal/meaningful statuses have a paymongoStatus mapping.
        // DRAFT has no paymongoStatus (null). We handle it by mapping
        // the domain statuses to the corresponding paymongoStatus strings.
        const statusToPaymongo: Record<string, string | null> = {
          PAID: "paid",
          PENDING: "pending",
          FAILED: "failed",
          EXPIRED: "expired",
          REFUNDED: "refunded",
          DRAFT: null,
        };
        where.paymongoStatus = statusToPaymongo[filters.status] ?? null;
      }

      const rows = await this.db.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });
      return Result.ok(rows.map((r) => mapRowToDomain(r as PrismaOrderRow)));
    } catch (err) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async update(order: Order): Promise<Result<Order, OrderError>> {
    try {
      await this.db.order.update({
        where: { id: order.id },
        data: {
          ...mapDomainToPrisma(order),
          // These are immutable after create — only update mutable fields above.
          // userId and courseId are set once at create time.
        },
      });
      return Result.ok(order);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
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
        where: { userId, courseId, paymongoStatus: "paid" },
      });
      if (!row) return Result.ok(null);
      return Result.ok(mapRowToDomain(row as PrismaOrderRow));
    } catch (err) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }
}

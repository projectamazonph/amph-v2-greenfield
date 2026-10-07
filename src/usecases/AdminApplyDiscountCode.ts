import { Result } from "@/domain/shared/Result";
import { calculateDiscount, type DiscountCode } from "@/domain/entities/DiscountCode";
import type { Order } from "@/domain/entities/Order";
import type { IOrderRepository, OrderError } from "@/ports/repositories/OrderRepository";
import type { IDiscountCodeRepository } from "@/ports/repositories/IDiscountCodeRepository";
import type { Clock } from "@/ports/system/Clock";
import type { RecordAuditLog } from "@/usecases/RecordAuditLog";
import type { Logger } from "@/ports/observability/Logger";

export interface AdminApplyDiscountCodeInput {
  orderId: string;
  actorId: string;
  code: string;
}

export type AdminApplyDiscountCodeError =
  | { kind: "order_not_found" }
  | { kind: "order_not_paid" }
  | { kind: "discount_already_applied" }
  | { kind: "code_not_found" }
  | { kind: "code_expired" }
  | { kind: "code_not_started" }
  | { kind: "code_maxed_out" }
  | { kind: "code_not_applicable" }
  | { kind: "order_update_failed"; message: string }
  | { kind: "db_error"; message: string };

export type AdminApplyDiscountCodeResult = Result<
  { order: Order; discountCodeId: string; discountMinor: number },
  AdminApplyDiscountCodeError
>;

export interface AdminApplyDiscountCodeDeps {
  orderRepo: IOrderRepository;
  discountCodeRepo: IDiscountCodeRepository;
  clock: Clock;
  recordAuditLog: RecordAuditLog;
  logger: Logger;
}

export class AdminApplyDiscountCode {
  constructor(private readonly deps: AdminApplyDiscountCodeDeps) {}

  async execute(input: AdminApplyDiscountCodeInput): Promise<AdminApplyDiscountCodeResult> {
    const normalizedCode = input.code.trim().toUpperCase();

    const orderResult = await this.deps.orderRepo.findById(input.orderId);
    if (!orderResult.ok) {
      if (orderResult.error.kind === "not_found") {
        return Result.err({ kind: "order_not_found" });
      }
      return this.dbOrderError(orderResult.error);
    }
    const order = orderResult.value;

    if (order.status !== "PAID") {
      // Only PAID orders are eligible. DRAFT/PENDING have not settled
      // with PayMongo, so mutating their totals would diverge from the
      // checkout session. REFUNDED orders keep the historical total
      // so the receipt stays meaningful.
      return Result.err({ kind: "order_not_paid" });
    }
    if (order.discountMinor > 0) {
      // Refuse to overwrite an existing discount. Operators can refund
      // and re-apply if they need a different code; the simple path
      // makes the audit trail trivial.
      return Result.err({ kind: "discount_already_applied" });
    }

    const code = await this.deps.discountCodeRepo.findByCode(normalizedCode);
    if (code === null) {
      return Result.err({ kind: "code_not_found" });
    }

    // Validity window: use the same predicates the public validator uses.
    const now = this.deps.clock.now();
    if (code.validUntil !== null && code.validUntil <= now) {
      return Result.err({ kind: "code_expired" });
    }
    if (code.validFrom !== null && code.validFrom > now) {
      return Result.err({ kind: "code_not_started" });
    }
    if (code.maxUses !== null && code.usedCount >= code.maxUses) {
      return Result.err({ kind: "code_maxed_out" });
    }
    if (code.courseIds.length > 0 && !code.courseIds.includes(order.courseId)) {
      return Result.err({ kind: "code_not_applicable" });
    }

    const discountMinor = calculateDiscount(code, order.subtotalMinor);
    if (discountMinor <= 0) {
      return Result.err({ kind: "code_not_applicable" });
    }

    const applyResult = order.applyAdminDiscount(discountMinor);
    if (!applyResult.ok) {
      return Result.err({ kind: "order_not_paid" });
    }
    const updateResult = await this.deps.orderRepo.update(order);
    if (!updateResult.ok) {
      if (updateResult.error.kind === "not_found") {
        return Result.err({ kind: "order_not_found" });
      }
      return this.dbOrderError(updateResult.error);
    }

    await this.deps.recordAuditLog.execute({
      actorId: input.actorId,
      action: "order.discount_applied",
      targetType: "order",
      targetId: order.id,
      metadata: {
        discountCodeId: code.id,
        discountCode: code.code,
        discountMinor,
      },
    });

    const usedCountResult = await this.deps.discountCodeRepo.incrementUsedCount(code.id);
    if (!usedCountResult.ok) {
      // Best-effort. The order is the source of truth for whether the
      // discount applied; this row is a counter that can be reconciled
      // against the audit log offline.
      this.deps.logger.warn("discount_code.increment_used_count_failed", {
        orderId: order.id,
        discountCodeId: code.id,
        error: usedCountResult.error,
      });
    }

    return Result.ok({
      order: updateResult.value,
      discountCodeId: code.id,
      discountMinor,
    });
  }

  private dbOrderError(error: OrderError): Result<never, AdminApplyDiscountCodeError> {
    return error.kind === "db_error"
      ? Result.err({ kind: "db_error", message: error.message })
      : Result.err({ kind: "order_update_failed", message: error.kind });
  }
}

// Re-export for clarity to readers who only know the use case file by name.
export type { DiscountCode };

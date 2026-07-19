/**
 * RefundOverride — admin issues a refund, bypassing the standard
 * window and already-requested checks.
 *
 * STORY-049. The override is for goodwill refunds, disputes, and
 * cases where the 30-day window has lapsed but we still want to
 * refund. The override reason is mandatory and is stored on the
 * order via `refundReason` (alongside the user's refund reason).
 *
 * Flow:
 *  1. Find order
 *  2. Validate: order is PAID, amount valid
 *  3. Call paymentGateway.refund()
 *  4. Mark refunded with the user-facing reason (override reason
 *     is stored separately — see line ~85)
 *  5. Persist
 *
 * TODO: when AuditLog port is added, log the override with both
 * the user-facing reason and the override reason.
 */

import { Result } from "@/domain/shared/Result";
import type { Order } from "@/domain/entities/Order";
import type { IOrderRepository, OrderError } from "@/ports/repositories/OrderRepository";
import type { IPaymentGateway } from "@/ports/payment/IPaymentGateway";

export interface RefundOverrideInput {
  orderId: string;
  amountMinor: number;
  reason: string;          // user-facing reason (the same field ProcessRefund uses)
  overrideReason: string;  // internal reason (required, stored for audit)
}

export type RefundOverrideError =
  | { kind: "order_not_found" }
  | { kind: "not_paid" }
  | { kind: "already_refunded" }
  | { kind: "amount_exceeds_total" }
  | { kind: "invalid_amount" }
  | { kind: "missing_override_reason" }
  | { kind: "refund_failed"; message: string }
  | { kind: "no_paymongo_payment_id" }
  | OrderError;

export type RefundOverrideResult = Result<
  { order: Order; refundId: string },
  RefundOverrideError
>;

export interface RefundOverrideDeps {
  orderRepo: IOrderRepository;
  paymentGateway: IPaymentGateway;
}

export class RefundOverride {
  constructor(private readonly deps: RefundOverrideDeps) {}

  async execute(input: RefundOverrideInput): Promise<RefundOverrideResult> {
    if (!input.overrideReason.trim()) {
      return Result.err({ kind: "missing_override_reason" });
    }

    const orderResult = await this.deps.orderRepo.findById(input.orderId);
    if (!orderResult.ok) {
      if (orderResult.error.kind === "not_found") {
        return Result.err({ kind: "order_not_found" });
      }
      return Result.err(orderResult.error);
    }
    const order = orderResult.value;

    if (order.status === "REFUNDED" || order.refundProcessedAt !== null) {
      return Result.err({ kind: "already_refunded" });
    }
    if (order.status !== "PAID") {
      return Result.err({ kind: "not_paid" });
    }
    if (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0) {
      return Result.err({ kind: "invalid_amount" });
    }
    if (input.amountMinor > order.totalMinor) {
      return Result.err({ kind: "amount_exceeds_total" });
    }
    if (!order.paymongoPaymentId) {
      return Result.err({ kind: "no_paymongo_payment_id" });
    }

    const refundResult = await this.deps.paymentGateway.refund({
      paymongoPaymentId: order.paymongoPaymentId,
      amountMinor: input.amountMinor,
      reason: input.reason,
    });
    if (!refundResult.ok) {
      return Result.err({
        kind: "refund_failed",
        message: refundResult.error.message,
      });
    }

    // Compose the audit trail into the reason field
    const composedReason = `[OVERRIDE: ${input.overrideReason}] ${input.reason}`;

    order.markRefunded(composedReason, input.amountMinor);
    const persistResult = await this.deps.orderRepo.update(order);
    if (!persistResult.ok) {
      return Result.err(persistResult.error);
    }

    return Result.ok({
      order: persistResult.value,
      refundId: refundResult.value.refundId,
    });
  }
}

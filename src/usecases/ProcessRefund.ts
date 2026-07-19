/**
 * ProcessRefund — admin issues a refund on a paid order.
 *
 * STORY-049. Standard path: validates 30-day window + no prior
 * refund request. Bypasses both via RefundOverride.
 *
 * Flow:
 *  1. Find order
 *  2. Validate: order is PAID, amountMinor <= totalMinor, within 30 days, no existing refund request
 *  3. Call paymentGateway.refund()
 *  4. On success: order.markRefunded(reason, amountMinor) + persist
 */

import { Result } from "@/domain/shared/Result";
import { isWithinRefundWindow } from "@/domain/values/OrderRefund";
import type { Order } from "@/domain/entities/Order";
import type { IOrderRepository, OrderError } from "@/ports/repositories/OrderRepository";
import type { IPaymentGateway } from "@/ports/payment/IPaymentGateway";
import type { Clock } from "@/ports/system/Clock";

export interface ProcessRefundInput {
  orderId: string;
  amountMinor: number;
  reason: string;
}

export type ProcessRefundError =
  | { kind: "order_not_found" }
  | { kind: "not_paid" }
  | { kind: "amount_exceeds_total" }
  | { kind: "outside_refund_window" }
  | { kind: "already_refunded" }
  | { kind: "refund_failed"; message: string }
  | { kind: "no_paymongo_payment_id" }
  | { kind: "invalid_amount" }
  | OrderError;

export type ProcessRefundResult = Result<
  { order: Order; refundId: string },
  ProcessRefundError
>;

export interface ProcessRefundDeps {
  orderRepo: IOrderRepository;
  paymentGateway: IPaymentGateway;
  clock: Clock;
}

export class ProcessRefund {
  constructor(private readonly deps: ProcessRefundDeps) {}

  async execute(input: ProcessRefundInput): Promise<ProcessRefundResult> {
    // ── 1. Find order ───────────────────────────────────────
    const orderResult = await this.deps.orderRepo.findById(input.orderId);
    if (!orderResult.ok) {
      if (orderResult.error.kind === "not_found") {
        return Result.err({ kind: "order_not_found" });
      }
      return Result.err(orderResult.error);
    }
    const order = orderResult.value;

    // ── 2. Validate ────────────────────────────────────────
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
    if (order.paymongoPaidAt && !isWithinRefundWindow(order, this.deps.clock.now())) {
      return Result.err({ kind: "outside_refund_window" });
    }
    if (!order.paymongoPaymentId) {
      return Result.err({ kind: "no_paymongo_payment_id" });
    }

    // ── 3. Call gateway ─────────────────────────────────────
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

    // ── 4. Mark refunded + persist ──────────────────────────
    order.markRefunded(input.reason, input.amountMinor);
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

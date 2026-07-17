/**
 * RequestRefund — student requests a refund on a paid order.
 *
 * STORY-025: RequestRefund use case + /api/refunds.
 *
 * Rules:
 *  1. Order must exist → order_not_found
 *  2. Order must belong to userId → not_your_order
 *  3. Order must be PAID → not_paid
 *  4. Must be within 30-day refund window → outside_refund_window
 *  5. Must not already have a refund request → already_requested
 *
 * Status stays PAID. Admin processes the refund later.
 */

import { Result } from "@/domain/shared/Result";
import { isWithinRefundWindow } from "@/domain/values/OrderRefund";
import type { IOrderRepository } from "@/ports/repositories/OrderRepository";
import type { Clock } from "@/ports/system/Clock";
import type { Order } from "@/domain/entities/Order";

export interface RequestRefundInput {
  orderId: string;
  userId: string;
  reason: string;
}

export interface RequestRefundDeps {
  orderRepo: IOrderRepository;
  clock: Clock;
}

export type RequestRefundError =
  | { kind: "order_not_found" }
  | { kind: "not_your_order" }
  | { kind: "not_paid" }
  | { kind: "outside_refund_window" }
  | { kind: "already_requested" };

export type RequestRefundResult = Result<{ order: Order }, RequestRefundError>;

export class RequestRefund {
  constructor(private readonly deps: RequestRefundDeps) {}

  async execute(input: RequestRefundInput): Promise<RequestRefundResult> {
    const { orderRepo, clock } = this.deps;

    // ── 1. Find order ───────────────────────────────────────
    const orderResult = await orderRepo.findById(input.orderId);
    if (Result.isErr(orderResult)) {
      return Result.err({ kind: "order_not_found" });
    }
    const order = orderResult.value;

    // ── 2. Check ownership ──────────────────────────────────
    if (order.userId !== input.userId) {
      return Result.err({ kind: "not_your_order" });
    }

    // ── 3. Must be PAID ─────────────────────────────────────
    if (order.status !== "PAID") {
      return Result.err({ kind: "not_paid" });
    }

    // ── 4. Within refund window ─────────────────────────────
    if (!isWithinRefundWindow(order, clock.now())) {
      return Result.err({ kind: "outside_refund_window" });
    }

    // ── 5. Not already requested ────────────────────────────
    if (order.refundRequestedAt !== null) {
      return Result.err({ kind: "already_requested" });
    }

    // ── 6. Record refund request ─────────────────────────────
    order.refundRequestedAt = clock.now();
    order.refundReason = input.reason;

    const updateResult = await orderRepo.update(order);
    if (Result.isErr(updateResult)) {
      // Persist failed — surface as a generic error (not a user-facing one)
      return Result.err({ kind: "order_not_found" });
    }

    return Result.ok({ order: updateResult.value });
  }
}

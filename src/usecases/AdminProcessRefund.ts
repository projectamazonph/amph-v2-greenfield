/**
 * AdminProcessRefund — process a student's pending refund request.
 *
 * STORY-062. Validates that the order actually has a refund request,
 * hasn't been processed yet, and is PAID. Then delegates to the
 * existing `RefundOverride` use case so all PayMongo-side refund
 * logic stays in one place (no duplication of the gateway call,
 * audit log, or override-reason composition).
 *
 * The override reason is fixed ("Admin processed student refund
 * request") because this code path is BY DEFINITION a student-
 * initiated request — there is no 30-day bypass to explain. The
 * student's own `refundReason` becomes the user-facing reason.
 *
 * The amount is also fixed: full refund of `order.totalMinor`.
 * Partial refunds for student-initiated requests are a future
 * concern; today the field is "request a refund" and the action
 * is "refund in full".
 *
 * Error model: every failure is a `Result.err`, never a thrown
 * exception. The page layer maps these onto user-visible messages.
 */

import { Result } from "@/domain/shared/Result";
import type { Order } from "@/domain/entities/Order";
import type { IOrderRepository, OrderError } from "@/ports/repositories/OrderRepository";
import { RefundOverride, type RefundOverrideError } from "@/usecases/RefundOverride";

export interface AdminProcessRefundInput {
  orderId: string;
  actorId: string; // admin user id from the session
}

export type AdminProcessRefundError =
  | { kind: "order_not_found" }
  | { kind: "no_refund_requested" }
  | { kind: "already_processed" }
  | { kind: "not_paid" }
  | OrderError
  | RefundOverrideError;

export type AdminProcessRefundResult = Result<
  { order: Order; refundId: string },
  AdminProcessRefundError
>;

export interface AdminProcessRefundDeps {
  orderRepo: IOrderRepository;
  refundOverride: RefundOverride;
}

export class AdminProcessRefund {
  constructor(private readonly deps: AdminProcessRefundDeps) {}

  async execute(input: AdminProcessRefundInput): Promise<AdminProcessRefundResult> {
    // ── 1. Find order ───────────────────────────────────────
    const orderResult = await this.deps.orderRepo.findById(input.orderId);
    if (!orderResult.ok) {
      if (orderResult.error.kind === "not_found") {
        return Result.err({ kind: "order_not_found" });
      }
      return Result.err(orderResult.error);
    }
    const order = orderResult.value;

    // ── 2. Validate the request shape ──────────────────────
    if (order.refundRequestedAt === null) {
      return Result.err({ kind: "no_refund_requested" });
    }
    if (order.refundProcessedAt !== null) {
      return Result.err({ kind: "already_processed" });
    }
    if (order.status !== "PAID") {
      return Result.err({ kind: "not_paid" });
    }

    // ── 3. Delegate to RefundOverride (reuses PayMongo call) ─
    const r = await this.deps.refundOverride.execute({
      orderId: order.id,
      actorId: input.actorId,
      amountMinor: order.totalMinor,
      reason: order.refundReason ?? "Refund",
      overrideReason: "Admin processed student refund request",
    });
    if (!r.ok) {
      return Result.err(r.error);
    }

    return Result.ok({ order: r.value.order, refundId: r.value.refundId });
  }
}

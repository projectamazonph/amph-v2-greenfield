/**
 * processRefundRequestAction — admin server action for the refund-request
 * flow on /admin/refunds.
 *
 * STORY-062. Distinct from `processRefundAction` (STORY-049), which
 * powers the manual refund form on /admin/payments/[id] and accepts
 * an arbitrary amount + override reason. This action is a thin
 * wrapper over `AdminProcessRefund` and takes only the orderId —
 * the amount is always the order total, the override reason is
 * fixed, and the user-facing reason is the student's own refund
 * reason (looked up by the use case).
 */

"use server";

import { Result } from "@/domain/shared/Result";
import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";

export interface ProcessRefundRequestActionInput {
  orderId: string;
}

export type ProcessRefundRequestActionResult = Result<
  { orderId: string; refundId: string },
  | { kind: "order_not_found" }
  | { kind: "no_refund_requested" }
  | { kind: "already_processed" }
  | { kind: "not_paid" }
  | { kind: "refund_failed"; message: string }
  | { kind: "no_paymongo_payment_id" }
  | { kind: "amount_exceeds_total" }
  | { kind: "invalid_amount" }
  | { kind: "already_refunded" }
  | { kind: "missing_override_reason" }
  | { kind: "db_error"; message: string }
  | { kind: "not_found" }
  | { kind: "unauthorized" }
>;

export async function processRefundRequestAction(
  input: ProcessRefundRequestActionInput,
): Promise<ProcessRefundRequestActionResult> {
  const container = buildContainer();

  const userId = await getSessionUserId();
  if (!userId) {
    return Result.err({ kind: "unauthorized" });
  }
  const userResult = await container.userRepo.findById(userId);
  if (!userResult.ok || userResult.value.role !== "ADMIN") {
    return Result.err({ kind: "unauthorized" });
  }

  const r = await container.adminProcessRefund.execute({
    orderId: input.orderId,
    actorId: userId,
  });
  if (!r.ok) {
    return Result.err(r.error);
  }

  return Result.ok({ orderId: input.orderId, refundId: r.value.refundId });
}

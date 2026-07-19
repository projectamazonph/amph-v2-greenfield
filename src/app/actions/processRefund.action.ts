/**
 * processRefundAction — admin server action to process a refund.
 *
 * STORY-049. Accepts `override: boolean` and `overrideReason` to
 * route to RefundOverride. The standard path (no override) calls
 * ProcessRefund which enforces the 30-day window.
 */

"use server";

import { Result } from "@/domain/shared/Result";
import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import type { ProcessRefund, ProcessRefundInput, ProcessRefundError } from "@/usecases/ProcessRefund";
import type { RefundOverride, RefundOverrideInput, RefundOverrideError } from "@/usecases/RefundOverride";
import type { UserRepository } from "@/ports/repositories/UserRepository";

export interface ProcessRefundFormInput {
  orderId: string;
  amountMinor: number;
  reason: string;
  override: boolean;
  overrideReason: string;
}

export type ProcessRefundActionResult = Result<
  { orderId: string; refundId: string },
  ProcessRefundError | RefundOverrideError | { kind: "unauthorized" }
>;

export async function performProcessRefund(
  container: {
    userRepo: UserRepository;
    processRefund: ProcessRefund;
    refundOverride: RefundOverride;
  },
  input: ProcessRefundFormInput,
  getCurrentAdminId: (
    container: { userRepo: UserRepository },
  ) => Promise<string | null>,
): Promise<ProcessRefundActionResult> {
  const adminId = await getCurrentAdminId(container);
  if (!adminId) {
    return Result.err({ kind: "unauthorized" });
  }

  if (input.override) {
    const r = await container.refundOverride.execute({
      orderId: input.orderId,
      actorId: adminId,
      amountMinor: input.amountMinor,
      reason: input.reason,
      overrideReason: input.overrideReason,
    } satisfies RefundOverrideInput);
    if (!r.ok) return Result.err(r.error);
    return Result.ok({ orderId: input.orderId, refundId: r.value.refundId });
  }

  const r = await container.processRefund.execute({
    orderId: input.orderId,
    amountMinor: input.amountMinor,
    reason: input.reason,
  } satisfies ProcessRefundInput);
  if (!r.ok) return Result.err(r.error);
  return Result.ok({ orderId: input.orderId, refundId: r.value.refundId });
}

async function defaultGetCurrentAdminId(container: {
  userRepo: UserRepository;
}): Promise<string | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const userResult = await container.userRepo.findById(userId);
  if (!userResult.ok) return null;
  if (userResult.value.role !== "ADMIN") return null;
  return userId;
}

export async function processRefundAction(
  input: ProcessRefundFormInput,
): Promise<ProcessRefundActionResult> {
  const container = buildContainer();
  return performProcessRefund(container, input, defaultGetCurrentAdminId);
}

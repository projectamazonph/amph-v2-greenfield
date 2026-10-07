/**
 * adminApplyDiscountCodeAction — server action that lets an admin
 * apply a discount code to a PAID order from the order detail page.
 *
 * STORY-024/050d. The discount code must already exist (admin CRUD is
 * the only path that creates codes). This action is the only path
 * through which a discount reaches an order.
 */

"use server";

import { Result } from "@/domain/shared/Result";
import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import type {
  AdminApplyDiscountCode,
  AdminApplyDiscountCodeError,
  AdminApplyDiscountCodeInput,
} from "@/usecases/AdminApplyDiscountCode";
import type { Order } from "@/domain/entities/Order";
import type { UserRepository } from "@/ports/repositories/UserRepository";

export type AdminApplyDiscountCodeActionInput = {
  orderId: string;
  code: string;
};

export type AdminApplyDiscountCodeActionResult = Result<
  { order: Order; discountMinor: number; discountCodeId: string },
  AdminApplyDiscountCodeError | { kind: "unauthorized" }
>;

export async function performAdminApplyDiscountCode(
  container: {
    userRepo: UserRepository;
    adminApplyDiscountCode: AdminApplyDiscountCode;
  },
  input: AdminApplyDiscountCodeActionInput,
  getCurrentAdminId: (container: { userRepo: UserRepository }) => Promise<string | null>,
): Promise<AdminApplyDiscountCodeActionResult> {
  const adminId = await getCurrentAdminId(container);
  if (!adminId) {
    return Result.err({ kind: "unauthorized" });
  }
  const r = await container.adminApplyDiscountCode.execute({
    orderId: input.orderId,
    actorId: adminId,
    code: input.code,
  } satisfies AdminApplyDiscountCodeInput);
  if (!r.ok) return Result.err(r.error);
  return Result.ok({
    order: r.value.order,
    discountMinor: r.value.discountMinor,
    discountCodeId: r.value.discountCodeId,
  });
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

export async function adminApplyDiscountCodeAction(
  input: AdminApplyDiscountCodeActionInput,
): Promise<AdminApplyDiscountCodeActionResult> {
  const container = buildContainer();
  return performAdminApplyDiscountCode(container, input, defaultGetCurrentAdminId);
}

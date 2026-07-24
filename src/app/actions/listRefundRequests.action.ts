/**
 * listRefundRequestsAction — server action to list refund requests.
 *
 * STORY-062. Used by the /admin/refunds page (server-side, via
 * buildContainer directly) and for any client-side refresh after
 * a tab change. The page itself does its own initial load.
 */

"use server";

import { Result } from "@/domain/shared/Result";
import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";

export interface ListRefundRequestsActionInput {
  status?: "pending" | "processed";
  userEmailSearch?: string;
  cursor?: string;
  limit?: number;
}

export type ListRefundRequestsActionResult = Result<
  {
    orders: {
      id: string;
      userId: string;
      userEmail: string;
      courseId: string;
      totalMinor: number;
      currency: string;
      refundReason: string | null;
      refundRequestedAt: string;
      refundProcessedAt: string | null;
      refundAmountMinor: number | null;
      status: string;
    }[];
    nextCursor: string | null;
    total: number;
  },
  | { kind: "unauthorized" }
  | { kind: "user_error"; message: string }
  | { kind: "db_error"; message: string }
  | { kind: "not_found" }
>;

export async function listRefundRequestsAction(
  input: ListRefundRequestsActionInput,
): Promise<ListRefundRequestsActionResult> {
  const container = buildContainer();

  const userId = await getSessionUserId();
  if (!userId) {
    return Result.err({ kind: "unauthorized" });
  }
  const userResult = await container.userRepo.findById(userId);
  if (!userResult.ok || userResult.value.role !== "ADMIN") {
    return Result.err({ kind: "unauthorized" });
  }

  const result = await container.listRefundRequests.execute(input);
  if (!result.ok) {
    return Result.err(result.error);
  }

  return Result.ok({
    orders: result.value.orders.map((o) => ({
      id: o.id,
      userId: o.userId,
      userEmail: result.value.users.get(o.userId)?.email ?? o.userId,
      courseId: o.courseId,
      totalMinor: o.totalMinor,
      currency: o.currency,
      refundReason: o.refundReason,
      refundRequestedAt: o.refundRequestedAt
        ? o.refundRequestedAt.toISOString()
        : new Date(0).toISOString(),
      refundProcessedAt: o.refundProcessedAt ? o.refundProcessedAt.toISOString() : null,
      refundAmountMinor: o.refundAmountMinor,
      status: o.status,
    })),
    nextCursor: result.value.nextCursor,
    total: result.value.total,
  });
}

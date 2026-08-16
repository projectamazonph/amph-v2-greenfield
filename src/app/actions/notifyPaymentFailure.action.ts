"use server";

import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";

export async function notifyPaymentFailure(
  orderId: string,
): Promise<{ ok: true; sent: boolean } | { ok: false }> {
  const normalizedOrderId = orderId.trim();
  const userId = await getSessionUserId();
  if (!userId || !normalizedOrderId) return { ok: false };

  const result = await buildContainer().notifyPaymentFailure.execute({
    orderId: normalizedOrderId,
    userId,
  });
  return result.ok ? { ok: true, sent: result.value.sent } : { ok: false };
}

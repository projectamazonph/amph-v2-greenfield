"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";

const schema = z.object({
  orderId: z.string().min(1).max(128),
  reason: z.string().trim().min(10).max(500),
});

export async function requestRefundAction(formData: FormData): Promise<never> {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login?redirect=%2Fprofile%2Fpurchases");

  const parsed = schema.safeParse({
    orderId: formData.get("orderId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) redirect("/profile/purchases?refundError=invalid_reason");

  const result = await buildContainer().requestRefund.execute({
    userId,
    orderId: parsed.data.orderId,
    reason: parsed.data.reason,
  });
  if (!result.ok) {
    redirect(`/profile/purchases?refundError=${result.error.kind}`);
  }

  revalidatePath("/profile/purchases");
  revalidatePath("/admin/refunds");
  redirect("/profile/purchases?refundRequested=1");
}

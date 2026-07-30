/**
 * adminGrantSubscription.action.ts, a server action.
 *
 * Admin grants a student a subscription tier outside checkout (paid
 * outside the platform). Injects actorId from the admin session.
 */
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import type { SubscriptionTier } from "@/domain/entities/User";
import type { Money } from "@/domain/values/Money";

export type AdminGrantSubscriptionPageInput = {
  email: string;
  firstName?: string;
  lastName?: string;
  subscriptionTier: SubscriptionTier;
  payment?: {
    method: string;
    amount: Money;
    reference?: string;
  };
};

export async function adminGrantSubscriptionAction(
  input: AdminGrantSubscriptionPageInput,
): Promise<{ ok: true; userId: string; isNewUser: boolean } | { ok: false; error: string }> {
  const session = await requireAdmin();
  const container = buildContainer();

  const r = await container.adminGrantSubscription.execute({
    ...input,
    actorId: session.id,
  });

  if (!r.ok) {
    return { ok: false, error: r.error.kind };
  }

  return { ok: true, userId: r.value.userId, isNewUser: r.value.isNewUser };
}

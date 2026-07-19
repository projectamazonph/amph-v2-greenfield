/**
 * createBadge.action.ts — server action.
 *
 * STORY-050e. Injects actorId from session.
 */
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";

export type CreateBadgePageInput = {
  slug: string;
  name: string;
  description: string;
  iconName: string;
  xpReward: number;
};

export async function createBadgeAction(
  input: CreateBadgePageInput,
): Promise<{ ok: true; badgeSlug: string } | { ok: false; error: string }> {
  const session = await requireAdmin();
  const container = buildContainer();

  const r = await container.adminCreateBadge.execute({
    ...input,
    actorId: session.id,
  });

  if (!r.ok) {
    return { ok: false, error: r.error.kind };
  }

  return { ok: true, badgeSlug: r.value.badge.slug };
}

/**
 * updateBadge.action.ts — server action.
 *
 * STORY-050e. Injects actorId from session.
 */
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import type { BadgeSlug } from "@/domain/entities/Badge";

export type UpdateBadgePageInput = {
  slug: BadgeSlug;
  patch: {
    name?: string;
    description?: string;
    iconName?: string;
    xpReward?: number;
    archived?: boolean;
  };
};

export async function updateBadgeAction(
  input: UpdateBadgePageInput,
): Promise<{ ok: true; badgeSlug: string } | { ok: false; error: string }> {
  const session = await requireAdmin();
  const container = buildContainer();

  const r = await container.adminUpdateBadge.execute({
    slug: input.slug,
    patch: input.patch,
    actorId: session.id,
  });

  if (!r.ok) {
    return { ok: false, error: r.error.kind };
  }

  return { ok: true, badgeSlug: r.value.badge.slug };
}

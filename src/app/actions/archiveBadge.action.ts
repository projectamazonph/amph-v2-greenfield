/**
 * archiveBadge.action.ts — server action.
 *
 * STORY-050e. Injects actorId from session.
 */
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import type { BadgeSlug } from "@/domain/entities/Badge";

export async function archiveBadgeAction(
  slug: BadgeSlug,
): Promise<{ ok: true; badgeSlug: string } | { ok: false; error: string }> {
  const session = await requireAdmin();
  const container = buildContainer();

  const r = await container.adminArchiveBadge.execute({
    slug,
    actorId: session.id,
  });

  if (!r.ok) {
    return { ok: false, error: r.error.kind };
  }

  return { ok: true, badgeSlug: r.value.badgeSlug };
}

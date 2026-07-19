/**
 * archiveDiscountCode.action.ts — server action.
 *
 * STORY-050d. Injects actorId from session.
 */
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";

export async function archiveDiscountCodeAction(
  id: string,
): Promise<{ ok: true; discountCodeId: string } | { ok: false; error: string }> {
  const session = await requireAdmin();
  const container = buildContainer();

  const r = await container.adminArchiveDiscountCode.execute({
    id,
    actorId: session.id,
  });

  if (!r.ok) {
    return { ok: false, error: r.error.kind };
  }

  return { ok: true, discountCodeId: r.value.discountCodeId };
}

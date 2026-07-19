/**
 * createDiscountCode.action.ts — server action.
 *
 * STORY-050d. Injects actorId from session.
 */
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import type { DiscountType } from "@/domain/entities/DiscountCode";

export type CreateDiscountCodePageInput = {
  code: string;
  type: DiscountType;
  value: number;
  maxUses?: number | null;
  validFrom?: string | null; // ISO date string
  validUntil?: string | null;
  courseIds?: readonly string[];
};

export async function createDiscountCodeAction(
  input: CreateDiscountCodePageInput,
): Promise<
  { ok: true; discountCodeId: string } | { ok: false; error: string }
> {
  const session = await requireAdmin();
  const container = buildContainer();

  const r = await container.adminCreateDiscountCode.execute({
    code: input.code,
    type: input.type,
    value: input.value,
    maxUses: input.maxUses ?? null,
    validFrom: input.validFrom ? new Date(input.validFrom) : null,
    validUntil: input.validUntil ? new Date(input.validUntil) : null,
    courseIds: input.courseIds ?? [],
    actorId: session.id,
  });

  if (!r.ok) {
    return { ok: false, error: r.error.kind };
  }

  return { ok: true, discountCodeId: r.value.discountCodeId };
}

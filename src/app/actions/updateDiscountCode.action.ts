/**
 * updateDiscountCode.action.ts — server action.
 *
 * STORY-050d. Injects actorId from session.
 */
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import type { UpdateDiscountCodePatch, DiscountType } from "@/domain/entities/DiscountCode";

export type UpdateDiscountCodePageInput = {
  id: string;
  patch: Omit<UpdateDiscountCodePatch, "validFrom" | "validUntil"> & {
    validFrom?: string | null;
    validUntil?: string | null;
  };
};

export async function updateDiscountCodeAction(
  input: UpdateDiscountCodePageInput,
): Promise<
  { ok: true; discountCodeId: string } | { ok: false; error: string }
> {
  const session = await requireAdmin();
  const container = buildContainer();

  const r = await container.adminUpdateDiscountCode.execute({
    id: input.id,
    patch: {
      code: input.patch.code,
      type: input.patch.type as DiscountType,
      value: input.patch.value,
      maxUses: input.patch.maxUses,
      validFrom: input.patch.validFrom ? new Date(input.patch.validFrom) : (input.patch.validFrom ?? undefined) as Date | null | undefined,
      validUntil: input.patch.validUntil ? new Date(input.patch.validUntil) : (input.patch.validUntil ?? undefined) as Date | null | undefined,
      courseIds: input.patch.courseIds,
    },
    actorId: session.id,
  });

  if (!r.ok) {
    return { ok: false, error: r.error.kind };
  }

  return { ok: true, discountCodeId: r.value.discountCodeId };
}

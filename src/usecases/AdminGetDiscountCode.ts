/**
 * `AdminGetDiscountCode` — get a single discount code by ID.
 *
 * STORY-050d.
 */
import type { Result } from "@/domain/shared/Result";
import type { DiscountCode } from "@/domain/entities/DiscountCode";
import type {
  IDiscountCodeRepository,
  DiscountCodeRepositoryError,
} from "@/ports/repositories/IDiscountCodeRepository";

export type AdminGetDiscountCodeResult = Result<
  DiscountCode,
  DiscountCodeRepositoryError
>;

export class AdminGetDiscountCode {
  constructor(private readonly deps: { discountCodeRepo: IDiscountCodeRepository }) {}

  async execute(id: string): Promise<AdminGetDiscountCodeResult> {
    const r = await this.deps.discountCodeRepo.findById(id);
    if (!r.ok) return r;
    if (r.value === null) {
      return { ok: false, error: { kind: "not_found" } };
    }
    return { ok: true, value: r.value };
  }
}

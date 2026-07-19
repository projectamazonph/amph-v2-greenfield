/**
 * `AdminListDiscountCodes` — list all active discount codes for the admin panel.
 *
 * STORY-050d.
 */
import type { Result } from "@/domain/shared/Result";
import type { DiscountCode } from "@/domain/entities/DiscountCode";
import type {
  IDiscountCodeRepository,
  DiscountCodeRepositoryError,
} from "@/ports/repositories/IDiscountCodeRepository";

export type AdminListDiscountCodesResult = Result<
  DiscountCode[],
  DiscountCodeRepositoryError
>;

export class AdminListDiscountCodes {
  constructor(private readonly deps: { discountCodeRepo: IDiscountCodeRepository }) {}

  async execute(): Promise<AdminListDiscountCodesResult> {
    return this.deps.discountCodeRepo.listAll();
  }
}

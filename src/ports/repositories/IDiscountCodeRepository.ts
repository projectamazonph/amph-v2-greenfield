/**
 * IDiscountCodeRepository — port for persisting and querying discount codes.
 *
 * STORY-024: Discount code model + repository + apply in checkout.
 *
 * ADR-014: Every port method returns Result<T, E>. No exceptions across boundaries.
 */

import type { Result } from "@/domain/shared/Result";
import type { DiscountCode } from "@/domain/entities/DiscountCode";

export type DiscountCodeError =
  | { kind: "not_found" }
  | { kind: "code_taken" }
  | { kind: "db_error"; message: string };

export interface IDiscountCodeRepository {
  /**
   * Find a discount code by its normalized code (uppercase).
   * Returns null if no code exists.
   * Case-insensitive lookup.
   */
  findByCode(code: string): Promise<DiscountCode | null>;

  /**
   * Persist a new discount code.
   * Returns code_taken if a code with this value already exists.
   */
  create(code: DiscountCode): Promise<Result<DiscountCode, DiscountCodeError>>;

  /**
   * Atomically increment the usedCount of a discount code.
   * Used after a successful checkout.
   */
  incrementUsedCount(codeId: string): Promise<Result<DiscountCode, DiscountCodeError>>;
}

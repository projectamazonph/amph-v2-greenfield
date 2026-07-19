/**
 * IDiscountCodeRepository — port for persisting and querying discount codes.
 *
 * STORY-024: Discount code model + repository + apply in checkout.
 * STORY-050d: Admin CRUD (listAll, findById, update, archive).
 *
 * ADR-014: Every port method returns Result<T, E>. No exceptions across boundaries.
 */

import type { Result } from "@/domain/shared/Result";
import type { DiscountCode } from "@/domain/entities/DiscountCode";

export type DiscountCodeRepositoryError =
  | { kind: "not_found" }
  | { kind: "code_taken" }
  | { kind: "archived" }
  | { kind: "db_error"; message: string };

export interface IDiscountCodeRepository {
  /**
   * List all active (non-archived) discount codes.
   * STORY-050d.
   */
  listAll(): Promise<Result<DiscountCode[], DiscountCodeRepositoryError>>;

  /**
   * Find a discount code by its ID.
   * STORY-050d.
   */
  findById(id: string): Promise<Result<DiscountCode | null, DiscountCodeRepositoryError>>;

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
  create(code: DiscountCode): Promise<Result<DiscountCode, DiscountCodeRepositoryError>>;

  /**
   * Persist updates to an existing discount code.
   * STORY-050d.
   */
  update(code: DiscountCode): Promise<Result<void, DiscountCodeRepositoryError>>;

  /**
   * Soft-delete (archive) a discount code.
   * STORY-050d.
   */
  archive(id: string): Promise<Result<void, DiscountCodeRepositoryError>>;

  /**
   * Atomically increment the usedCount of a discount code.
   * Used after a successful checkout.
   */
  incrementUsedCount(codeId: string): Promise<Result<DiscountCode, DiscountCodeRepositoryError>>;
}

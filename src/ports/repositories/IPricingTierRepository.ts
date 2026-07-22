/**
 * IPricingTierRepository — port for persisting and querying pricing tiers.
 *
 * STORY-011: PricingTier model + repository.
 *
 * ADR-014: Every port method returns Result<T, E>. No exceptions
 * across layer boundaries.
 *
 * Soft-delete convention: a tier with `status === "ARCHIVED"` is
 * hidden from `listAll()` / `findById()` / `findBySlug()` (same
 * pattern as the `Course.status = "ARCHIVED"` and `LiveClass.status
 * = "cancelled"` conventions in this codebase).
 */

import type { Result } from "@/domain/shared/Result";
import type { PricingTier } from "@/domain/entities/PricingTier";

export type PricingTierRepositoryError =
  { kind: "not_found" } | { kind: "slug_taken" } | { kind: "db_error"; message: string };

export interface IPricingTierRepository {
  /**
   * List all non-archived tiers, ordered by `displayOrder` then
   * `createdAt` (matching `comparePricingTiers`).
   */
  listAll(): Promise<Result<readonly PricingTier[], PricingTierRepositoryError>>;

  /**
   * List ACTIVE tiers only (the public pricing page). Same ordering
   * as `listAll()`.
   */
  listActive(): Promise<Result<readonly PricingTier[], PricingTierRepositoryError>>;

  /**
   * Find a tier by id. Returns `null` for both "not found" and
   * "archived" — matches the `DiscountCode` and `Course` soft-delete
   * convention.
   */
  findById(id: string): Promise<Result<PricingTier | null, PricingTierRepositoryError>>;

  /**
   * Find a tier by slug. Returns `null` for both "not found" and
   * "archived". Slug lookup is case-sensitive (slugs are normalized
   * to lowercase by the factory).
   */
  findBySlug(slug: string): Promise<Result<PricingTier | null, PricingTierRepositoryError>>;

  /**
   * Persist a new tier. Enforces slug uniqueness across all tiers
   * (including archived). Returns `slug_taken` on conflict.
   */
  create(tier: PricingTier): Promise<Result<PricingTier, PricingTierRepositoryError>>;

  /**
   * Persist updates to an existing tier. Enforces slug uniqueness
   * (excluding the current tier). Returns `not_found` if the id
   * doesn't exist, `slug_taken` on collision with another tier.
   */
  update(tier: PricingTier): Promise<Result<PricingTier, PricingTierRepositoryError>>;

  /**
   * Soft-delete: set `status = "ARCHIVED"`. Idempotent: re-archiving
   * an already-ARCHIVED tier returns the existing tier unchanged.
   * Returns `not_found` if the id doesn't exist.
   */
  archive(id: string): Promise<Result<PricingTier, PricingTierRepositoryError>>;
}

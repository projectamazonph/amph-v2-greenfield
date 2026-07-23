/**
 * InMemoryPricingTierRepository — fast, synchronous test adapter for
 * IPricingTierRepository.
 *
 * STORY-011: PricingTier model + repository.
 *
 * Mirrors `InMemoryCourseRepository` and `InMemoryDiscountCodeRepository`:
 * plain `Map`-backed storage, `seed()` for test setup, `clear()` for
 * teardown. Soft-delete is tracked with a `Set` of archived tier ids.
 */

import type {
  IPricingTierRepository,
  PricingTierRepositoryError,
} from "@/ports/repositories/IPricingTierRepository";
import type { PricingTier } from "@/domain/entities/PricingTier";
import { comparePricingTiers } from "@/domain/entities/PricingTier";
import { Result } from "@/domain/shared/Result";

export class InMemoryPricingTierRepository implements IPricingTierRepository {
  private tiers = new Map<string, PricingTier>(); // id -> tier
  private archived = new Set<string>(); // archived tier ids

  async listAll(): Promise<Result<readonly PricingTier[], PricingTierRepositoryError>> {
    try {
      const all = Array.from(this.tiers.values())
        .filter((t) => !this.archived.has(t.id))
        .slice() // copy before sort
        .sort(comparePricingTiers);
      return Result.ok(all);
    } catch (err) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async listActive(): Promise<Result<readonly PricingTier[], PricingTierRepositoryError>> {
    try {
      const active = Array.from(this.tiers.values())
        .filter((t) => t.status === "ACTIVE" && !this.archived.has(t.id))
        .slice()
        .sort(comparePricingTiers);
      return Result.ok(active);
    } catch (err) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async findById(id: string): Promise<Result<PricingTier | null, PricingTierRepositoryError>> {
    try {
      const tier = this.tiers.get(id);
      if (!tier) return Result.ok(null);
      if (this.archived.has(id)) return Result.ok(null);
      return Result.ok(tier);
    } catch (err) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async findBySlug(slug: string): Promise<Result<PricingTier | null, PricingTierRepositoryError>> {
    try {
      for (const tier of this.tiers.values()) {
        if (tier.slug !== slug) continue;
        if (this.archived.has(tier.id)) return Result.ok(null);
        return Result.ok(tier);
      }
      return Result.ok(null);
    } catch (err) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async create(tier: PricingTier): Promise<Result<PricingTier, PricingTierRepositoryError>> {
    try {
      // Slug uniqueness including archived tiers.
      for (const existing of this.tiers.values()) {
        if (existing.slug === tier.slug) {
          return Result.err({ kind: "slug_taken" });
        }
      }
      this.tiers.set(tier.id, Object.freeze({ ...tier }));
      return Result.ok(tier);
    } catch (err) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async update(tier: PricingTier): Promise<Result<PricingTier, PricingTierRepositoryError>> {
    try {
      if (!this.tiers.has(tier.id)) {
        return Result.err({ kind: "not_found" });
      }
      // Slug uniqueness excluding self.
      for (const existing of this.tiers.values()) {
        if (existing.id !== tier.id && existing.slug === tier.slug) {
          return Result.err({ kind: "slug_taken" });
        }
      }
      this.tiers.set(tier.id, Object.freeze({ ...tier }));
      return Result.ok(tier);
    } catch (err) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async archive(id: string): Promise<Result<PricingTier, PricingTierRepositoryError>> {
    try {
      const existing = this.tiers.get(id);
      if (!existing) return Result.err({ kind: "not_found" });
      if (this.archived.has(id)) {
        return Result.ok(existing);
      }
      this.archived.add(id);
      const archived: PricingTier = Object.freeze({
        ...existing,
        status: "ARCHIVED",
        updatedAt: new Date(),
      });
      this.tiers.set(id, archived);
      return Result.ok(archived);
    } catch (err) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  /** Remove all tiers. Call between tests. */
  clear(): void {
    this.tiers.clear();
    this.archived.clear();
  }

  /** Pre-seed a tier (test-only helper). */
  seed(tier: PricingTier): void {
    this.tiers.set(tier.id, Object.freeze({ ...tier }));
    // Clear archived flag on re-seed
    this.archived.delete(tier.id);
  }

  /** Pre-seed several tiers. */
  seedMany(tiers: readonly PricingTier[]): void {
    for (const tier of tiers) this.seed(tier);
  }
}

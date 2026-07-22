/**
 * PrismaPricingTierRepository — production adapter for IPricingTierRepository.
 *
 * STORY-011: PricingTier model + repository.
 *
 * P0-2 follow-up: the `pricing_tiers` table is brand new (migration
 * 20260722050000_pricing_tier), so plain `CREATE INDEX` is correct
 * here — no existing traffic to lock, same as the original baseline
 * migration. (P2002 unique violations on `slug` are mapped to
 * `slug_taken`; P2025 record-not-found on update is mapped to
 * `not_found`, matching the other P0-2 fixes.)
 *
 * Soft-delete is encoded as `status = "ARCHIVED"`, matching the
 * `Course.status` and `LiveClass.status` convention. `listAll()` and
 * `findById()`/`findBySlug()` filter on `status != "ARCHIVED"`.
 */

import { PrismaClient } from "@prisma/client";
import { Result } from "@/domain/shared/Result";
import type {
  IPricingTierRepository,
  PricingTierRepositoryError,
} from "@/ports/repositories/IPricingTierRepository";
import type { PricingTier, PricingTierStatus } from "@/domain/entities/PricingTier";
import { comparePricingTiers } from "@/domain/entities/PricingTier";
import { Money } from "@/domain/values/Money";

interface PrismaPricingTierRow {
  id: string;
  slug: string;
  name: string;
  priceMinor: number;
  currency: string;
  status: string;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export class PrismaPricingTierRepository implements IPricingTierRepository {
  constructor(private readonly db: PrismaClient) {}

  async listAll(): Promise<Result<readonly PricingTier[], PricingTierRepositoryError>> {
    try {
      const rows = await this.db.pricingTier.findMany({
        where: { status: { not: "ARCHIVED" } },
      });
      const tiers = rows.map((r) => this.mapRow(r as PrismaPricingTierRow));
      // Sort in code: the Prisma `orderBy` could match, but
      // comparePricingTiers is the single source of truth (matches
      // the InMemory adapter and any other adapter that ever shows
      // up). The result set is small (handful of tiers at most), so
      // in-code sort is fine.
      tiers.sort(comparePricingTiers);
      return Result.ok(tiers);
    } catch (err) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async listActive(): Promise<Result<readonly PricingTier[], PricingTierRepositoryError>> {
    try {
      const rows = await this.db.pricingTier.findMany({
        where: { status: "ACTIVE" },
      });
      const tiers = rows.map((r) => this.mapRow(r as PrismaPricingTierRow));
      tiers.sort(comparePricingTiers);
      return Result.ok(tiers);
    } catch (err) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async findById(id: string): Promise<Result<PricingTier | null, PricingTierRepositoryError>> {
    try {
      const row = await this.db.pricingTier.findUnique({ where: { id } });
      if (!row) return Result.ok(null);
      if ((row as PrismaPricingTierRow).status === "ARCHIVED") {
        return Result.ok(null);
      }
      return Result.ok(this.mapRow(row as PrismaPricingTierRow));
    } catch (err) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async findBySlug(slug: string): Promise<Result<PricingTier | null, PricingTierRepositoryError>> {
    try {
      const row = await this.db.pricingTier.findUnique({ where: { slug } });
      if (!row) return Result.ok(null);
      if ((row as PrismaPricingTierRow).status === "ARCHIVED") {
        return Result.ok(null);
      }
      return Result.ok(this.mapRow(row as PrismaPricingTierRow));
    } catch (err) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async create(tier: PricingTier): Promise<Result<PricingTier, PricingTierRepositoryError>> {
    try {
      const row = await this.db.pricingTier.create({
        data: this.mapData(tier),
      });
      return Result.ok(this.mapRow(row as PrismaPricingTierRow));
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code: string }).code === "P2002"
      ) {
        return Result.err({ kind: "slug_taken" });
      }
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async update(tier: PricingTier): Promise<Result<PricingTier, PricingTierRepositoryError>> {
    try {
      // Slug uniqueness excluding self — match the InMemory adapter's
      // explicit pre-check. The Prisma @@unique on `slug` will catch
      // the collision (P2002) but only at flush time; pre-checking
      // matches the InMemory contract and surfaces the right error
      // kind for tests.
      const existing = await this.db.pricingTier.findFirst({
        where: { slug: tier.slug, NOT: { id: tier.id } },
      });
      if (existing) {
        return Result.err({ kind: "slug_taken" });
      }
      const row = await this.db.pricingTier.update({
        where: { id: tier.id },
        data: this.mapData(tier),
      });
      return Result.ok(this.mapRow(row as PrismaPricingTierRow));
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err) {
        const code = (err as { code: string }).code;
        if (code === "P2025") {
          return Result.err({ kind: "not_found" });
        }
        if (code === "P2002") {
          return Result.err({ kind: "slug_taken" });
        }
      }
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async archive(id: string): Promise<Result<PricingTier, PricingTierRepositoryError>> {
    try {
      // Idempotent archive: if already ARCHIVED, return the existing
      // row without an UPDATE.
      const existing = await this.db.pricingTier.findUnique({ where: { id } });
      if (!existing) return Result.err({ kind: "not_found" });
      if ((existing as PrismaPricingTierRow).status === "ARCHIVED") {
        return Result.ok(this.mapRow(existing as PrismaPricingTierRow));
      }
      const row = await this.db.pricingTier.update({
        where: { id },
        data: { status: "ARCHIVED" },
      });
      return Result.ok(this.mapRow(row as PrismaPricingTierRow));
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code: string }).code === "P2025"
      ) {
        return Result.err({ kind: "not_found" });
      }
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  // ── mappers ────────────────────────────────────────────

  private mapData(tier: PricingTier): {
    id: string;
    slug: string;
    name: string;
    priceMinor: number;
    currency: string;
    status: string;
    displayOrder: number;
  } {
    return {
      id: tier.id,
      slug: tier.slug,
      name: tier.name,
      priceMinor: tier.price.minor,
      currency: tier.price.currency,
      status: tier.status,
      displayOrder: tier.displayOrder,
    };
  }

  private mapRow(row: PrismaPricingTierRow): PricingTier {
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      price: Money.of(row.priceMinor, row.currency as "PHP" | "USD"),
      status: row.status as PricingTierStatus,
      displayOrder: row.displayOrder,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

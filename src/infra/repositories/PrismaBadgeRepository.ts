/**
 * PrismaBadgeRepository — production adapter for IBadgeRepository.
 *
 * STORY-035: Badge system.
 * STORY-050e: Admin CRUD (create, update, archive).
 */

import { Prisma, PrismaClient } from "@prisma/client";
import { Result } from "@/domain/shared/Result";
import type { IBadgeRepository, BadgeRepositoryError } from "@/ports/repositories/IBadgeRepository";
import type { Badge, BadgeSlug } from "@/domain/entities/Badge";

type BadgeRow = Prisma.BadgeGetPayload<{}>;

export class PrismaBadgeRepository implements IBadgeRepository {
  constructor(private readonly db: PrismaClient) {}

  async findBySlug(slug: BadgeSlug): Promise<Result<Badge | null, BadgeRepositoryError>> {
    try {
      const row: BadgeRow | null = await this.db.badge.findUnique({ where: { slug } });
      if (!row) return Result.ok(null);
      return Result.ok(this.mapRow(row));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async findAll(): Promise<Result<readonly Badge[], BadgeRepositoryError>> {
    try {
      const rows = await this.db.badge.findMany();
      return Result.ok(rows.map((r) => this.mapRow(r)));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  // ── STORY-050e: admin methods ───────────────────────────────────────

  async create(badge: Badge): Promise<Result<Badge, BadgeRepositoryError>> {
    try {
      // Pre-check slug uniqueness (matches InMemoryBadgeRepository contract)
      const existing = await this.db.badge.findUnique({ where: { slug: badge.slug } });
      if (existing) {
        return Result.err({ kind: "slug_taken" });
      }
      const row: BadgeRow = await this.db.badge.create({
        data: {
          slug: badge.slug,
          name: badge.name,
          description: badge.description,
          iconName: badge.iconName,
          xpReward: badge.xpReward,
          archived: badge.archived,
        },
      });
      return Result.ok(this.mapRow(row));
    } catch (err: unknown) {
      // P2002 = unique constraint violation (slug collision)
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

  async update(badge: Badge): Promise<Result<Badge, BadgeRepositoryError>> {
    try {
      const row: BadgeRow = await this.db.badge.update({
        where: { slug: badge.slug },
        data: {
          name: badge.name,
          description: badge.description,
          iconName: badge.iconName,
          xpReward: badge.xpReward,
          archived: badge.archived,
        },
      });
      return Result.ok(this.mapRow(row));
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err) {
        const code = (err as { code: string }).code;
        if (code === "P2025") return Result.err({ kind: "not_found" });
        if (code === "P2002") return Result.err({ kind: "slug_taken" });
      }
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async archive(slug: BadgeSlug): Promise<Result<void, BadgeRepositoryError>> {
    try {
      await this.db.badge.update({
        where: { slug },
        data: { archived: true },
      });
      return Result.ok(undefined);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err) {
        if ((err as { code: string }).code === "P2025") {
          return Result.err({ kind: "not_found" });
        }
      }
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  private mapRow(row: BadgeRow): Badge {
    return {
      slug: row.slug as BadgeSlug,
      name: row.name,
      description: row.description,
      iconName: row.iconName,
      xpReward: row.xpReward,
      archived: row.archived,
    };
  }
}

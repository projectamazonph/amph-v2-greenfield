/**
 * PrismaBadgeRepository — production adapter for IBadgeRepository.
 *
 * STORY-035: Badge system.
 * STORY-050e: Stub for create, update, archive.
 */

import { Prisma, PrismaClient } from "@prisma/client";
import { Result } from "@/domain/shared/Result";
import type { IBadgeRepository, BadgeRepositoryError } from "@/ports/repositories/IBadgeRepository";
import type { Badge, BadgeSlug } from "@/domain/entities/Badge";

export class PrismaBadgeRepository implements IBadgeRepository {
  constructor(private readonly db: PrismaClient) {}

  async findBySlug(slug: BadgeSlug): Promise<Result<Badge | null, BadgeRepositoryError>> {
    try {
      const row: Prisma.BadgeGetPayload<{}> | null = await this.db.badge.findUnique({ where: { slug } });
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

  // ── STORY-050e: stub methods awaiting Prisma schema ─────────────────

  async create(): Promise<Result<Badge, BadgeRepositoryError>> {
    throw new Error("Not implemented: PrismaBadgeRepository.create");
  }

  async update(): Promise<Result<Badge, BadgeRepositoryError>> {
    throw new Error("Not implemented: PrismaBadgeRepository.update");
  }

  async archive(): Promise<Result<void, BadgeRepositoryError>> {
    throw new Error("Not implemented: PrismaBadgeRepository.archive");
  }

  private mapRow(row: Prisma.BadgeGetPayload<{}>): Badge {
    return {
      slug: row.slug as BadgeSlug,
      name: row.name,
      description: row.description,
      iconName: row.iconName,
      xpReward: row.xpReward,
      archived: (row as { archived?: boolean }).archived ?? false,
    };
  }
}

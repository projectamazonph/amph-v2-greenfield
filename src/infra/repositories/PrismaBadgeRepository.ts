/**
 * PrismaBadgeRepository — production adapter for IBadgeRepository.
 *
 * STORY-035: Badge system.
 */

import { PrismaClient } from "@prisma/client";
import { Result } from "@/domain/shared/Result";
import type { IBadgeRepository } from "@/ports/repositories/IBadgeRepository";
import type { Badge, BadgeSlug } from "@/domain/entities/Badge";
import type { BadgeError } from "@/ports/repositories/IBadgeRepository";

export class PrismaBadgeRepository implements IBadgeRepository {
  constructor(private readonly db: PrismaClient) {}

  async findBySlug(slug: BadgeSlug): Promise<Result<Badge | null, BadgeError>> {
    try {
      // @ts-expect-error — badge model added in STORY-035; Prisma client regeneration pending
      const row = await this.db.badge.findUnique({ where: { slug } });
      if (!row) return Result.ok(null);
      return Result.ok(this.mapRow(row));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async findAll(): Promise<Result<readonly Badge[], BadgeError>> {
    try {
      // @ts-expect-error — badge model added in STORY-035; Prisma client regeneration pending
      const rows: any[] = await this.db.badge.findMany();
      return Result.ok(rows.map((r) => this.mapRow(r)));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapRow(row: any): Badge {
    return {
      slug: row.slug as BadgeSlug,
      name: row.name,
      description: row.description,
      iconName: row.iconName,
      xpReward: row.xpReward,
    };
  }
}

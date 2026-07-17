/**
 * PrismaBadgeAwardRepository — production adapter for IBadgeAwardRepository.
 *
 * STORY-035: Badge system.
 */

import { PrismaClient } from "@prisma/client";
import { Result } from "@/domain/shared/Result";
import type { IBadgeAwardRepository } from "@/ports/repositories/IBadgeAwardRepository";
import type { BadgeAward } from "@/domain/entities/BadgeAward";
import type { BadgeSlug } from "@/domain/entities/Badge";
import type { BadgeAwardError } from "@/ports/repositories/IBadgeAwardRepository";

export class PrismaBadgeAwardRepository implements IBadgeAwardRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(award: BadgeAward): Promise<Result<BadgeAward, BadgeAwardError>> {
    try {
      const row = await this.db.badgeAward.create({
        data: {
          id: award.id,
          userId: award.userId,
          badgeSlug: award.badgeSlug,
          awardedAt: award.awardedAt,
        },
      });
      return Result.ok(this.mapRow(row));
    } catch (err: unknown) {
      // P2002 = unique constraint violation (user already has this badge)
      const msg = String(err);
      if (msg.includes("P2002") || msg.includes("unique")) {
        return Result.err({
          kind: "already_awarded",
          badgeSlug: award.badgeSlug,
        });
      }
      return Result.err({ kind: "db_error", message: msg });
    }
  }

  async findByUserId(userId: string): Promise<Result<readonly BadgeAward[], BadgeAwardError>> {
    try {
      const rows: any[] = await this.db.badgeAward.findMany({
        where: { userId },
        orderBy: { awardedAt: "desc" },
      });
      return Result.ok(rows.map((r) => this.mapRow(r)));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async exists(userId: string, badgeSlug: BadgeSlug): Promise<Result<boolean, BadgeAwardError>> {
    try {
      const row = await this.db.badgeAward.findUnique({
        where: { userId_badgeSlug: { userId, badgeSlug } },
      });
      return Result.ok(row !== null);
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapRow(row: any): BadgeAward {
    return {
      id: row.id,
      userId: row.userId,
      badgeSlug: row.badgeSlug as BadgeSlug,
      awardedAt: row.awardedAt,
    };
  }
}

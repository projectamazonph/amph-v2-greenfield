/**
 * PrismaUserStreakRepository — Story 029.
 *
 * The production adapter for the IUserStreakRepository port.
 */

import { PrismaClient } from "@prisma/client";
import { Result } from "@/domain/shared/Result";
import type { IUserStreakRepository, UserStreakError } from "@/ports/repositories/IUserStreakRepository";
import type { UserStreak } from "@/domain/services/StreakService";

export class PrismaUserStreakRepository implements IUserStreakRepository {
  constructor(private readonly db: PrismaClient) {}

  async findByUserId(userId: string): Promise<Result<UserStreak | null, UserStreakError>> {
    try {
      const row = await this.db.userStreak.findUnique({ where: { userId } });
      if (!row) return Result.ok(null);
      return Result.ok(this.mapRow(row));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async upsert(streak: UserStreak): Promise<Result<UserStreak, UserStreakError>> {
    try {
      const row = await this.db.userStreak.upsert({
        where: { userId: streak.userId },
        create: {
          id: streak.id,
          userId: streak.userId,
          currentStreak: streak.currentStreak,
          longestStreak: streak.longestStreak,
          lastVisitDate: streak.lastVisitDate ?? new Date(),
        },
        update: {
          currentStreak: streak.currentStreak,
          longestStreak: streak.longestStreak,
          lastVisitDate: streak.lastVisitDate ?? new Date(),
        },
      });
      return Result.ok(this.mapRow(row));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  // ── Private helpers ────────────────────────────────────────

  private mapRow(row: {
    id: string;
    userId: string;
    currentStreak: number;
    longestStreak: number;
    lastVisitDate: Date;
    createdAt: Date;
    updatedAt: Date;
  }): UserStreak {
    return {
      id: row.id,
      userId: row.userId,
      currentStreak: row.currentStreak,
      longestStreak: row.longestStreak,
      lastVisitDate: row.lastVisitDate,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

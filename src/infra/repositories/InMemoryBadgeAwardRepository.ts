/**
 * InMemoryBadgeAwardRepository — fast in-memory fake for tests.
 *
 * STORY-035: Badge system.
 */

import { Result } from "@/domain/shared/Result";
import type { IBadgeAwardRepository } from "@/ports/repositories/IBadgeAwardRepository";
import type { BadgeAward } from "@/domain/entities/BadgeAward";
import type { BadgeAwardError } from "@/ports/repositories/IBadgeAwardRepository";
import type { BadgeSlug } from "@/domain/entities/Badge";

export class InMemoryBadgeAwardRepository implements IBadgeAwardRepository {
  private awards = new Map<string, BadgeAward>(); // key = award.id

  async create(award: BadgeAward): Promise<Result<BadgeAward, BadgeAwardError>> {
    // Check duplicate by userId + badgeSlug
    const existing = [...this.awards.values()].find(
      (a) => a.userId === award.userId && a.badgeSlug === award.badgeSlug,
    );
    if (existing) {
      return Result.err({ kind: "already_awarded", badgeSlug: award.badgeSlug });
    }
    this.awards.set(award.id, award);
    return Result.ok(award);
  }

  async findByUserId(userId: string): Promise<Result<readonly BadgeAward[], BadgeAwardError>> {
    const awards = [...this.awards.values()]
      .filter((a) => a.userId === userId)
      .sort((a, b) => b.awardedAt.getTime() - a.awardedAt.getTime()); // newest first
    return Result.ok(awards);
  }

  async exists(userId: string, badgeSlug: BadgeSlug): Promise<Result<boolean, BadgeAwardError>> {
    const found = [...this.awards.values()].some(
      (a) => a.userId === userId && a.badgeSlug === badgeSlug,
    );
    return Result.ok(found);
  }

  /** Clear all awards. Call between tests. */
  clear(): void {
    this.awards.clear();
  }
}

/**
 * IBadgeAwardRepository — port for persisting badge awards.
 *
 * STORY-035: Badge system.
 */

import { Result } from "@/domain/shared/Result";
import type { BadgeAward, BadgeAwardError } from "@/domain/entities/BadgeAward";
import type { BadgeSlug } from "@/domain/entities/Badge";

// Re-export so callers can use the single type
export type { BadgeAwardError };

export interface IBadgeAwardRepository {
  /**
   * Persist a new badge award.
   * The repository must enforce a UNIQUE constraint on (userId, badgeSlug).
   */
  create(award: BadgeAward): Promise<Result<BadgeAward, BadgeAwardError>>;

  /**
   * Find all badge awards for a user, newest first.
   */
  findByUserId(userId: string): Promise<Result<readonly BadgeAward[], BadgeAwardError>>;

  /**
   * Check whether a user already has a specific badge.
   */
  exists(userId: string, badgeSlug: BadgeSlug): Promise<Result<boolean, BadgeAwardError>>;
}

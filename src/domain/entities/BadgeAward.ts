/**
 * BadgeAward — a badge awarded to a user.
 *
 * STORY-035: Badge system.
 *
 * Links a specific user to a specific badge at a specific time.
 * The combination of userId + badgeSlug is unique (enforced at the DB level).
 */

import { Result } from "@/domain/shared/Result";
import type { BadgeSlug } from "@/domain/entities/Badge";

export interface BadgeAward {
  readonly id: string;
  readonly userId: string;
  readonly badgeSlug: BadgeSlug;
  readonly awardedAt: Date;
}

/** All errors that can arise when working with badge awards. */
export type BadgeAwardError =
  | { kind: "invalid_slug" }
  | { kind: "already_awarded"; badgeSlug: BadgeSlug }
  | { kind: "db_error"; message: string };

// ── Factory ────────────────────────────────────────────────────────────────

export function createBadgeAward(params: {
  id: string;
  userId: string;
  badgeSlug: string;
  awardedAt: Date;
}): Result<BadgeAward, BadgeAwardError> {
  if (
    params.badgeSlug !== "first-quiz-pass" &&
    params.badgeSlug !== "5-day-streak" &&
    params.badgeSlug !== "all-3-courses-enrolled"
  ) {
    return Result.err({ kind: "invalid_slug" });
  }

  return Result.ok({
    id: params.id,
    userId: params.userId,
    badgeSlug: params.badgeSlug,
    awardedAt: params.awardedAt,
  });
}

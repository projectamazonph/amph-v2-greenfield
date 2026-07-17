/**
 * ListUserBadges — returns all badges a user has earned.
 *
 * STORY-035: Badge system.
 *
 * Fetches the user's badge awards (newest first), then resolves each award's
 * badge template to return a merged view with both the template fields
 * and the awardedAt timestamp.
 */

import { Result } from "@/domain/shared/Result";
import type { IBadgeRepository } from "@/ports/repositories/IBadgeRepository";
import type { IBadgeAwardRepository } from "@/ports/repositories/IBadgeAwardRepository";
import type { Badge } from "@/domain/entities/Badge";
import type { BadgeSlug } from "@/domain/entities/Badge";

// ── Input / Output types ───────────────────────────────────────────────────

export interface ListUserBadgesInput {
  userId: string;
}

/** Badge template merged with the user's award timestamp */
export type UserBadge = Badge & { awardedAt: Date; awardId: string };

export type ListUserBadgesError = { kind: "db_error"; message: string };

export type ListUserBadgesResult = Result<{ badges: readonly UserBadge[] }, ListUserBadgesError>;

// ── Dependencies ─────────────────────────────────────────────────────────────

export interface ListUserBadgesDeps {
  badgeRepo: IBadgeRepository;
  badgeAwardRepo: IBadgeAwardRepository;
}

// ── Use Case ─────────────────────────────────────────────────────────────────

export class ListUserBadges {
  constructor(private readonly deps: ListUserBadgesDeps) {}

  async execute(input: ListUserBadgesInput): Promise<ListUserBadgesResult> {
    // ── 1. Fetch all awards for the user ────────────────────
    const awardsResult = await this.deps.badgeAwardRepo.findByUserId(input.userId);
    if (!awardsResult.ok) {
      const msg =
        awardsResult.error.kind === "db_error" ? awardsResult.error.message : "Unknown error";
      return Result.err({ kind: "db_error", message: msg });
    }
    const awards = awardsResult.value;

    if (awards.length === 0) {
      return Result.ok({ badges: [] });
    }

    // ── 2. Fetch all badge templates ─────────────────────────
    const allBadgesResult = await this.deps.badgeRepo.findAll();
    if (!allBadgesResult.ok) {
      return Result.err({ kind: "db_error", message: "Failed to fetch badge templates" });
    }
    const badgeMap = new Map<BadgeSlug, Badge>(allBadgesResult.value.map((b) => [b.slug, b]));

    // ── 3. Merge ───────────────────────────────────────────────
    const merged: UserBadge[] = awards
      .map((award) => {
        const badge = badgeMap.get(award.badgeSlug);
        if (!badge) return null;
        return { ...badge, awardedAt: award.awardedAt, awardId: award.id };
      })
      .filter((b): b is UserBadge => b !== null);

    return Result.ok({ badges: merged });
  }
}

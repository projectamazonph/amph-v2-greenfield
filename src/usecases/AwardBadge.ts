/**
 * AwardBadge — awards a badge to a user.
 *
 * STORY-035: Badge system.
 *
 * Flow:
 * 1. Find badge by slug → badge_not_found
 * 2. Check if already awarded → already_awarded
 * 3. Create BadgeAward row
 * 4. Award badge.xpReward XP (fire-and-forget)
 * 5. Return { badgeAward, xpAwarded }
 */

import { Result } from "@/domain/shared/Result";
import type { IBadgeRepository } from "@/ports/repositories/IBadgeRepository";
import type { IBadgeAwardRepository } from "@/ports/repositories/IBadgeAwardRepository";
import type { IdGenerator } from "@/ports/system/IdGenerator";
import type { BadgeSlug } from "@/domain/entities/Badge";
import { createBadgeAward } from "@/domain/entities/BadgeAward";
import type { BadgeAward } from "@/domain/entities/BadgeAward";
import { AwardXP } from "@/usecases/AwardXP";

// ── Input / Output types ───────────────────────────────────────────────────

export interface AwardBadgeInput {
  userId: string;
  badgeSlug: BadgeSlug;
}

export type AwardBadgeError =
  | { kind: "badge_not_found" }
  | { kind: "already_awarded"; badgeSlug: BadgeSlug }
  | { kind: "db_error"; message: string };

export type AwardBadgeResult = Result<
  { badgeAward: BadgeAward; xpAwarded: number },
  AwardBadgeError
>;

// ── Dependencies ─────────────────────────────────────────────────────────────

export interface AwardBadgeDeps {
  badgeRepo: IBadgeRepository;
  badgeAwardRepo: IBadgeAwardRepository;
  awardXp: AwardXP; // shared AwardXP instance for XP awards
  idGen: IdGenerator;
}

// ── Use Case ─────────────────────────────────────────────────────────────────

export class AwardBadge {
  constructor(private readonly deps: AwardBadgeDeps) {}

  async execute(input: AwardBadgeInput): Promise<AwardBadgeResult> {
    // ── 1. Find badge ────────────────────────────────────────────
    const badgeResult = await this.deps.badgeRepo.findBySlug(input.badgeSlug);
    if (!badgeResult.ok) {
      return Result.err({ kind: "db_error", message: "Failed to fetch badge" });
    }
    const badge = badgeResult.value;
    if (!badge) {
      return Result.err({ kind: "badge_not_found" });
    }

    // ── 2. Check already awarded ───────────────────────────────
    const existsResult = await this.deps.badgeAwardRepo.exists(input.userId, input.badgeSlug);
    if (!existsResult.ok) {
      return Result.err({ kind: "db_error", message: "Failed to check existing award" });
    }
    if (existsResult.value) {
      return Result.err({ kind: "already_awarded", badgeSlug: input.badgeSlug });
    }

    // ── 3. Create award ─────────────────────────────────────────
    const awardResult = createBadgeAward({
      id: this.deps.idGen.newId(),
      userId: input.userId,
      badgeSlug: input.badgeSlug,
      awardedAt: new Date(),
    });
    if (!awardResult.ok) {
      // Map any createBadgeAward error to db_error — shouldn't happen if slug was pre-validated
      let msg = "Badge creation failed";
      if (awardResult.error.kind === "db_error") {
        msg = awardResult.error.message;
      }
      return Result.err({ kind: "db_error", message: msg });
    }

    const persistResult = await this.deps.badgeAwardRepo.create(awardResult.value);
    if (!persistResult.ok) {
      if (persistResult.error.kind === "already_awarded") {
        return Result.err({ kind: "already_awarded", badgeSlug: persistResult.error.badgeSlug });
      }
      if (persistResult.error.kind === "db_error") {
        return Result.err({ kind: "db_error", message: persistResult.error.message });
      }
      // Should not happen: invalid_slug from create — treat as db_error
      return Result.err({ kind: "db_error", message: "Badge award persistence failed" });
    }
    const badgeAward = persistResult.value;

    // ── 4. Award XP (fire-and-forget) ─────────────────────────
    if (badge.xpReward > 0) {
      this.deps.awardXp
        .execute({
          userId: input.userId,
          amount: badge.xpReward,
          reason: "badge_awarded",
          refId: badgeAward.id,
        })
        .catch((err: unknown) => {
          console.error("[AwardBadge] Failed to award badge XP:", err);
        });
    }

    return Result.ok({ badgeAward, xpAwarded: badge.xpReward });
  }
}

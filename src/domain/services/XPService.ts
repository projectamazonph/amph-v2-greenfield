/**
 * XPService — XP constants and tier logic.
 *
 * STORY-028: XPService + XP display on dashboard.
 */

import type { XPReason } from "@/domain/entities/XPEvent";

// ── XP Constants ─────────────────────────────────────────────────────────────

export class XPService {
  /** XP awarded per lesson completion */
  static readonly LESSON_XP = 10;

  /** Bonus XP awarded when a course is completed */
  static readonly COURSE_COMPLETE_BONUS_XP = 50;

  /** XP awarded when a quiz is passed */
  static readonly QUIZ_PASSED_XP = 20;

  /** XP thresholds for each tier */
  private static readonly TIER_THRESHOLDS: readonly [number, string][] = [
    [0, "Newcomer"],
    [100, "Learner"],
    [500, "Achiever"],
    [1000, "Expert"],
    [2500, "Master"],
  ];

  // ── Tier logic ────────────────────────────────────────────────────────────

  /**
   * Returns the tier label for a given total XP.
   * Tiers: Newcomer (0–99), Learner (100–499), Achiever (500–999),
   *        Expert (1000–2499), Master (2500+)
   */
  static xpTierLabel(totalXp: number): string {
    const tiers = this.TIER_THRESHOLDS;
    let label = tiers[0]![1]!;

    for (const [threshold, tierLabel] of tiers) {
      if (totalXp >= threshold) {
        label = tierLabel;
      } else {
        break;
      }
    }

    return label;
  }

  /**
   * Returns true if the given string is a valid XP reason.
   */
  static isXpReason(reason: string): reason is XPReason {
    return (
      reason === "lesson_completed" ||
      reason === "course_completed" ||
      reason === "quiz_passed" ||
      reason === "streak_bonus" ||
      reason === "badge_awarded"
    );
  }
}

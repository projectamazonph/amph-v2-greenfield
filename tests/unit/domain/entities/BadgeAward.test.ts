/**
 * BadgeAward entity tests — TDD (red first).
 *
 * STORY-035: Badge system.
 */

import { describe, it, expect } from "vitest";
import { createBadgeAward } from "@/domain/entities/BadgeAward";

const USER_ID = "user_01";
const BADGE_SLUG = "first-quiz-pass" as const;
const NOW = new Date("2025-07-01T00:00:00Z");

describe("BadgeAward", () => {
  describe("createBadgeAward", () => {
    it("creates a valid badge award", () => {
      const result = createBadgeAward({
        id: "award_01",
        userId: USER_ID,
        badgeSlug: BADGE_SLUG,
        awardedAt: NOW,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.id).toBe("award_01");
      expect(result.value.userId).toBe(USER_ID);
      expect(result.value.badgeSlug).toBe(BADGE_SLUG);
      expect(result.value.awardedAt).toBe(NOW);
    });

    it("creates an award with a different badge slug", () => {
      const result = createBadgeAward({
        id: "award_02",
        userId: USER_ID,
        badgeSlug: "5-day-streak",
        awardedAt: NOW,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.badgeSlug).toBe("5-day-streak");
    });

    it("returns invalid_slug for an unrecognized badge slug", () => {
      const result = createBadgeAward({
        id: "award_03",
        userId: USER_ID,
        badgeSlug: "nonexistent-badge",
        awardedAt: NOW,
      });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.kind).toBe("invalid_slug");
    });
  });
});

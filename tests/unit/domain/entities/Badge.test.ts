/**
 * Badge entity tests — TDD (red first).
 *
 * STORY-035: Badge system.
 */

import { describe, it, expect } from "vitest";
import { createBadge } from "@/domain/entities/Badge";

describe("Badge", () => {
  describe("createBadge", () => {
    it("creates a valid badge with all required fields", () => {
      const result = createBadge({
        slug: "first-quiz-pass",
        name: "First Quiz Pass",
        description: "Passed your first quiz",
        iconName: "Trophy",
        xpReward: 25,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.slug).toBe("first-quiz-pass");
      expect(result.value.name).toBe("First Quiz Pass");
      expect(result.value.description).toBe("Passed your first quiz");
      expect(result.value.iconName).toBe("Trophy");
      expect(result.value.xpReward).toBe(25);
    });

    it("creates a badge with zero XP reward", () => {
      const result = createBadge({
        slug: "5-day-streak",
        name: "5-Day Streak",
        description: "Visited the platform 5 days in a row",
        iconName: "Fire",
        xpReward: 0,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.xpReward).toBe(0);
    });

    it("returns invalid_slug for an unrecognized badge slug", () => {
      const result = createBadge({
        slug: "not-a-real-badge",
        name: "Fake Badge",
        description: "A badge that does not exist",
        iconName: "Star",
        xpReward: 10,
      });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.kind).toBe("invalid_slug");
    });
  });
});

import { describe, it, expect } from "vitest";
import { XPService } from "@/domain/services/XPService";

describe("XPService", () => {
  describe("LESSON_XP", () => {
    it("awards 10 XP per lesson", () => {
      expect(XPService.LESSON_XP).toBe(10);
    });
  });

  describe("COURSE_COMPLETE_BONUS_XP", () => {
    it("awards 50 XP bonus for course completion", () => {
      expect(XPService.COURSE_COMPLETE_BONUS_XP).toBe(50);
    });
  });

  describe("xpTierLabel", () => {
    it("returns Newcomer for 0–99 XP", () => {
      expect(XPService.xpTierLabel(0)).toBe("Newcomer");
      expect(XPService.xpTierLabel(50)).toBe("Newcomer");
      expect(XPService.xpTierLabel(99)).toBe("Newcomer");
    });

    it("returns Learner for 100–499 XP", () => {
      expect(XPService.xpTierLabel(100)).toBe("Learner");
      expect(XPService.xpTierLabel(250)).toBe("Learner");
      expect(XPService.xpTierLabel(499)).toBe("Learner");
    });

    it("returns Achiever for 500–999 XP", () => {
      expect(XPService.xpTierLabel(500)).toBe("Achiever");
      expect(XPService.xpTierLabel(750)).toBe("Achiever");
      expect(XPService.xpTierLabel(999)).toBe("Achiever");
    });

    it("returns Expert for 1000–2499 XP", () => {
      expect(XPService.xpTierLabel(1000)).toBe("Expert");
      expect(XPService.xpTierLabel(1750)).toBe("Expert");
      expect(XPService.xpTierLabel(2499)).toBe("Expert");
    });

    it("returns Master for 2500+ XP", () => {
      expect(XPService.xpTierLabel(2500)).toBe("Master");
      expect(XPService.xpTierLabel(5000)).toBe("Master");
      expect(XPService.xpTierLabel(10000)).toBe("Master");
    });
  });

  describe("isXpReason", () => {
    it("returns true for valid reasons", () => {
      expect(XPService.isXpReason("lesson_completed")).toBe(true);
      expect(XPService.isXpReason("course_completed")).toBe(true);
      expect(XPService.isXpReason("quiz_passed")).toBe(true);
      expect(XPService.isXpReason("streak_bonus")).toBe(true);
    });

    it("returns false for invalid reasons", () => {
      expect(XPService.isXpReason("unknown")).toBe(false);
      expect(XPService.isXpReason("")).toBe(false);
    });
  });
});

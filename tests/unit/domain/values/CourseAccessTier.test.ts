import { describe, it, expect } from "vitest";
import { subscriptionMeetsCourseTier, COURSE_ACCESS_TIERS } from "@/domain/values/CourseAccessTier";

type SubTier = "FREE" | "STARTER" | "PRO";

describe("CourseAccessTier", () => {
  describe("subscriptionMeetsCourseTier", () => {
    // ── PRO user ───────────────────────────────────────────────────
    it("PRO satisfies PRO course", () => {
      expect(subscriptionMeetsCourseTier("PRO", "PRO")).toBe(true);
    });
    it("PRO satisfies STARTER course", () => {
      expect(subscriptionMeetsCourseTier("PRO", "STARTER")).toBe(true);
    });
    it("PRO satisfies PREVIEW course", () => {
      expect(subscriptionMeetsCourseTier("PRO", "PREVIEW")).toBe(true);
    });

    // ── STARTER user ───────────────────────────────────────────────
    it("STARTER satisfies STARTER course", () => {
      expect(subscriptionMeetsCourseTier("STARTER", "STARTER")).toBe(true);
    });
    it("STARTER does NOT satisfy PRO course", () => {
      expect(subscriptionMeetsCourseTier("STARTER", "PRO")).toBe(false);
    });
    // STARTER ≥ PREVIEW in the hierarchy → satisfies PREVIEW for full access.
    // (TierAccessPolicy Rule 2 handles PREVIEW courses separately, so this
    // only matters when PREVIEW check is bypassed.)
    it("STARTER satisfies PREVIEW course (hierarchy: STARTER > PREVIEW)", () => {
      expect(subscriptionMeetsCourseTier("STARTER", "PREVIEW")).toBe(true);
    });

    // ── FREE user ─────────────────────────────────────────────────
    it("FREE does NOT satisfy PRO course", () => {
      expect(subscriptionMeetsCourseTier("FREE", "PRO")).toBe(false);
    });
    it("FREE does NOT satisfy STARTER course", () => {
      expect(subscriptionMeetsCourseTier("FREE", "STARTER")).toBe(false);
    });
    it("FREE satisfies PREVIEW course", () => {
      expect(subscriptionMeetsCourseTier("FREE", "PREVIEW")).toBe(true);
    });

    // ── type guard ────────────────────────────────────────────────
    it("COURSE_ACCESS_TIERS contains all three tiers", () => {
      expect(COURSE_ACCESS_TIERS).toContain("STARTER");
      expect(COURSE_ACCESS_TIERS).toContain("PRO");
      expect(COURSE_ACCESS_TIERS).toContain("PREVIEW");
    });
  });
});

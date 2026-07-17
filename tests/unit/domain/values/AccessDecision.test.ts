import { describe, it, expect } from "vitest";
import {
  AccessDecision,
  isAllowed,
  isDenied,
} from "@/domain/values/AccessDecision";

describe("AccessDecision", () => {
  describe("isAllowed", () => {
    it("returns true for allowed", () => {
      expect(isAllowed({ kind: "allowed" })).toBe(true);
    });
    it("returns true for allowed_preview", () => {
      expect(isAllowed({ kind: "allowed_preview", previewLessonCount: 2 })).toBe(true);
    });
    it("returns false for denied_tier", () => {
      expect(isAllowed({ kind: "denied_tier", userTier: "FREE", requiredTier: "PRO" })).toBe(false);
    });
    it("returns false for denied_not_enrolled", () => {
      expect(isAllowed({ kind: "denied_not_enrolled" })).toBe(false);
    });
    it("returns false for denied_not_authenticated", () => {
      expect(isAllowed({ kind: "denied_not_authenticated" })).toBe(false);
    });
  });

  describe("isDenied", () => {
    it("returns false for allowed", () => {
      expect(isDenied({ kind: "allowed" })).toBe(false);
    });
    it("returns true for denied_tier", () => {
      expect(isDenied({ kind: "denied_tier", userTier: "FREE", requiredTier: "PRO" })).toBe(true);
    });
    it("returns true for denied_not_enrolled", () => {
      expect(isDenied({ kind: "denied_not_enrolled" })).toBe(true);
    });
    it("returns true for denied_not_authenticated", () => {
      expect(isDenied({ kind: "denied_not_authenticated" })).toBe(true);
    });
  });

  describe("allowed_preview carries previewLessonCount", () => {
    it("preview count is preserved", () => {
      const decision: AccessDecision = { kind: "allowed_preview", previewLessonCount: 3 };
      expect(decision.kind).toBe("allowed_preview");
      expect(decision.previewLessonCount).toBe(3);
    });
  });

  describe("denied_tier carries tier info", () => {
    it("tier info is preserved", () => {
      const decision: AccessDecision = {
        kind: "denied_tier",
        userTier: "STARTER",
        requiredTier: "PRO",
      };
      expect(decision.kind).toBe("denied_tier");
      expect(decision.userTier).toBe("STARTER");
      expect(decision.requiredTier).toBe("PRO");
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createXPEvent } from "@/domain/entities/XPEvent";
import type { Clock } from "@/ports/system/Clock";

const NOW = new Date("2025-07-01T00:00:00Z");
const mockClock: Clock = { now: vi.fn(() => NOW) };

describe("XPEvent", () => {
  describe("createXPEvent", () => {
    it("creates a valid XPEvent", () => {
      const result = createXPEvent({
        id: "xpe_01",
        userId: "user_01",
        amount: 10,
        reason: "lesson_completed",
        refId: "les_01",
        createdAt: NOW,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.id).toBe("xpe_01");
      expect(result.value.userId).toBe("user_01");
      expect(result.value.amount).toBe(10);
      expect(result.value.reason).toBe("lesson_completed");
      expect(result.value.refId).toBe("les_01");
      expect(result.value.createdAt).toBe(NOW);
    });

    it("creates XPEvent without refId (course completion)", () => {
      const result = createXPEvent({
        id: "xpe_02",
        userId: "user_01",
        amount: 50,
        reason: "course_completed",
        refId: "course_01",
        createdAt: NOW,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.refId).toBe("course_01");
    });

    it("returns error for amount <= 0", () => {
      const result = createXPEvent({
        id: "xpe_03",
        userId: "user_01",
        amount: 0,
        reason: "lesson_completed",
        createdAt: NOW,
      });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.kind).toBe("invalid_amount");
    });

    it("returns error for negative amount", () => {
      const result = createXPEvent({
        id: "xpe_04",
        userId: "user_01",
        amount: -5,
        reason: "lesson_completed",
        createdAt: NOW,
      });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.kind).toBe("invalid_amount");
    });

    it("returns error for blank userId", () => {
      const result = createXPEvent({
        id: "xpe_05",
        userId: "   ",
        amount: 10,
        reason: "lesson_completed",
        createdAt: NOW,
      });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.kind).toBe("invalid_user_id");
    });

    it("returns error for unknown reason", () => {
      const result = createXPEvent({
        id: "xpe_06",
        userId: "user_01",
        amount: 10,
        reason: "unknown_action",
        createdAt: NOW,
      });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.kind).toBe("invalid_reason");
    });

    it("accepts all valid reasons", () => {
      const reasons = ["lesson_completed", "course_completed", "quiz_passed", "streak_bonus"] as const;
      for (const reason of reasons) {
        const result = createXPEvent({
          id: `xpe_${reason}`,
          userId: "user_01",
          amount: 10,
          reason,
          createdAt: NOW,
        });
        expect(result.ok, `reason ${reason} should be valid`).toBe(true);
      }
    });
  });
});

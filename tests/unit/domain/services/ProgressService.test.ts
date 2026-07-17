import { describe, it, expect } from "vitest";
import {
  computeProgressPercent,
  isCourseCompleted,
} from "@/domain/services/ProgressService";

describe("ProgressService", () => {
  describe("computeProgressPercent", () => {
    it("0/10 = 0", () => {
      expect(computeProgressPercent([], 10)).toBe(0);
    });

    it("1/10 = 10", () => {
      expect(computeProgressPercent(["les_01"], 10)).toBe(10);
    });

    it("3/10 = 30", () => {
      expect(computeProgressPercent(["les_01", "les_02", "les_03"], 10)).toBe(30);
    });

    it("9/10 = 90", () => {
      const ids = Array.from({ length: 9 }, (_, i) => `les_${i + 1}`);
      expect(computeProgressPercent(ids, 10)).toBe(90);
    });

    it("10/10 = 100", () => {
      const ids = Array.from({ length: 10 }, (_, i) => `les_${i + 1}`);
      expect(computeProgressPercent(ids, 10)).toBe(100);
    });

    it("1/3 = 33 (floor)", () => {
      expect(computeProgressPercent(["les_01"], 3)).toBe(33);
    });

    it("2/3 = 67 (rounded)", () => {
      // Math.round(66.67) = 67
      expect(computeProgressPercent(["les_01", "les_02"], 3)).toBe(67);
    });

    it("1/1 = 100", () => {
      expect(computeProgressPercent(["les_01"], 1)).toBe(100);
    });

    it("handles empty curriculum (0 lessons)", () => {
      expect(computeProgressPercent([], 0)).toBe(0);
    });

    it("handles more completed than total (edge case — should cap at 100)", () => {
      // If completed > total (shouldn't happen but be safe)
      expect(computeProgressPercent(["les_01", "les_02", "les_03"], 1)).toBe(100);
    });
  });

  describe("isCourseCompleted", () => {
    it("false when 0/10 completed", () => {
      expect(isCourseCompleted([], 10)).toBe(false);
    });

    it("false when 9/10 completed", () => {
      const ids = Array.from({ length: 9 }, (_, i) => `les_${i + 1}`);
      expect(isCourseCompleted(ids, 10)).toBe(false);
    });

    it("true when 10/10 completed", () => {
      const ids = Array.from({ length: 10 }, (_, i) => `les_${i + 1}`);
      expect(isCourseCompleted(ids, 10)).toBe(true);
    });

    it("true when 1/1 completed", () => {
      expect(isCourseCompleted(["les_01"], 1)).toBe(true);
    });

    it("false when 0/0 (empty course)", () => {
      expect(isCourseCompleted([], 0)).toBe(false);
    });
  });
});

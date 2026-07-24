/**
 * ScorePolicy entity tests.
 *
 * STORY-065: Scoring Engine + Dimensional Policies.
 */

import { describe, it, expect } from "vitest";
import {
  createScorePolicy,
  getOverallScore,
  isPassed,
  isValidPolicy,
  getWeightForDimension,
  hydrateScorePolicy,
  type ScorePolicyError,
} from "@/domain/entities/ScorePolicy";

const validDims = {
  direction: { weight: 0.4, passingThreshold: 80 },
  magnitude: { weight: 0.3, passingThreshold: 70 },
  profitability: { weight: 0.3, passingThreshold: 75 },
};

const baseParams = {
  id: "pol_bid_01",
  simulatorId: "bid-elevator" as const,
  difficulty: "beginner" as const,
  mode: "practice" as const,
  dimensionConfig: validDims,
};

describe("ScorePolicy", () => {
  describe("createScorePolicy", () => {
    it("creates a valid policy with default passingScore of 70", () => {
      const result = createScorePolicy(baseParams);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const policy = result.value;
      expect(policy.id).toBe("pol_bid_01");
      expect(policy.simulatorId).toBe("bid-elevator");
      expect(policy.difficulty).toBe("beginner");
      expect(policy.mode).toBe("practice");
      expect(policy.passingScore).toBe(70);
      expect(policy.createdAt).toBeInstanceOf(Date);
      expect(policy.updatedAt).toBeInstanceOf(Date);
    });

    it("creates a policy with a custom passingScore", () => {
      const result = createScorePolicy({ ...baseParams, passingScore: 85 });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.passingScore).toBe(85);
    });

    it("rejects a policy with weight sum not equal to 1.0", () => {
      const badDims = {
        direction: { weight: 0.5, passingThreshold: 80 },
        magnitude: { weight: 0.3, passingThreshold: 70 },
      };
      const result = createScorePolicy({ ...baseParams, dimensionConfig: badDims });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      const err = result.error as ScorePolicyError;
      expect(err.kind).toBe("invalid_weight_sum");
    });

    it("accepts weight sum within ±0.001 tolerance", () => {
      const nearDims = {
        direction: { weight: 0.333, passingThreshold: 80 },
        magnitude: { weight: 0.333, passingThreshold: 70 },
        profitability: { weight: 0.334, passingThreshold: 75 },
      };
      const result = createScorePolicy({ ...baseParams, dimensionConfig: nearDims });
      expect(result.ok).toBe(true);
    });

    it("rejects a policy with an unknown dimension name", () => {
      const badDims = {
        direction: { weight: 0.4, passingThreshold: 80 },
        magnitude: { weight: 0.3, passingThreshold: 70 },
        totallyUnknownDimension: { weight: 0.3, passingThreshold: 75 },
      };
      const result = createScorePolicy({ ...baseParams, dimensionConfig: badDims });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      const err = result.error as ScorePolicyError;
      expect(err.kind).toBe("unknown_dimension");
      if (err.kind !== "unknown_dimension") return;
      expect(err.dimension).toBe("totallyUnknownDimension");
    });

    it("rejects a policy with passingScore below 0", () => {
      const result = createScorePolicy({ ...baseParams, passingScore: -5 });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      const err = result.error as ScorePolicyError;
      expect(err.kind).toBe("invalid_config");
    });

    it("rejects a policy with passingScore above 100", () => {
      const result = createScorePolicy({ ...baseParams, passingScore: 101 });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      const err = result.error as ScorePolicyError;
      expect(err.kind).toBe("invalid_config");
    });

    it("accepts a single-dimension policy with weight 1.0", () => {
      const singleDim = { direction: { weight: 1.0, passingThreshold: 80 } };
      const result = createScorePolicy({ ...baseParams, dimensionConfig: singleDim });
      expect(result.ok).toBe(true);
    });
  });

  describe("getOverallScore", () => {
    it("computes 100 for perfect scores", () => {
      const result = createScorePolicy(baseParams);
      if (!result.ok) return;
      const score = getOverallScore(
        { direction: 100, magnitude: 100, profitability: 100 },
        result.value,
      );
      expect(score).toBe(100);
    });

    it("computes the weighted average for mixed scores", () => {
      const result = createScorePolicy(baseParams);
      if (!result.ok) return;
      // direction: 0.4 * 80/100 * 100 = 32
      // magnitude:  0.3 * 60/100 * 100 = 18
      // profitability: 0.3 * 50/100 * 100 = 15
      // total = 65
      const score = getOverallScore(
        { direction: 80, magnitude: 60, profitability: 50 },
        result.value,
      );
      expect(score).toBe(65);
    });

    it("treats missing dimensions as 0", () => {
      const result = createScorePolicy(baseParams);
      if (!result.ok) return;
      // direction: 0.4 * 100/100 * 100 = 40
      // profitability: 0.3 * 100/100 * 100 = 30
      // magnitude: missing -> 0
      // total = 70
      const score = getOverallScore({ direction: 100, profitability: 100 }, result.value);
      expect(score).toBe(70);
    });

    it("caps overall score at 100", () => {
      const result = createScorePolicy(baseParams);
      if (!result.ok) return;
      const score = getOverallScore(
        { direction: 100, magnitude: 100, profitability: 100 },
        result.value,
      );
      expect(score).toBe(100);
    });

    it("clamps negative raw scores to 0", () => {
      const result = createScorePolicy(baseParams);
      if (!result.ok) return;
      // direction: 0.4 * 0/100 * 100 = 0
      // magnitude: 0.3 * 50/100 * 100 = 15
      // profitability: 0.3 * 50/100 * 100 = 15
      // total = 30
      const score = getOverallScore(
        { direction: -10, magnitude: 50, profitability: 50 },
        result.value,
      );
      expect(score).toBe(30);
    });

    it("returns 0 when all dimensions are missing", () => {
      const result = createScorePolicy(baseParams);
      if (!result.ok) return;
      expect(getOverallScore({}, result.value)).toBe(0);
    });
  });

  describe("isPassed", () => {
    it("returns true when score equals passingScore", () => {
      const result = createScorePolicy({ ...baseParams, passingScore: 70 });
      if (!result.ok) return;
      expect(isPassed(70, result.value)).toBe(true);
    });

    it("returns true when score is above passingScore", () => {
      const result = createScorePolicy({ ...baseParams, passingScore: 70 });
      if (!result.ok) return;
      expect(isPassed(85, result.value)).toBe(true);
    });

    it("returns false when score is below passingScore", () => {
      const result = createScorePolicy({ ...baseParams, passingScore: 70 });
      if (!result.ok) return;
      expect(isPassed(55, result.value)).toBe(false);
    });
  });

  describe("isValidPolicy", () => {
    it("returns true for a factory-created policy", () => {
      const result = createScorePolicy(baseParams);
      if (!result.ok) return;
      expect(isValidPolicy(result.value)).toBe(true);
    });

    it("returns false for invalid weight sum", () => {
      const result = createScorePolicy(baseParams);
      if (!result.ok) return;
      const bad = {
        ...result.value,
        dimensionConfig: {
          ...result.value.dimensionConfig,
          magnitude: { weight: 0.1, passingThreshold: 70 },
        },
      };
      expect(isValidPolicy(bad)).toBe(false);
    });
  });

  describe("getWeightForDimension", () => {
    it("returns the weight when the dimension exists", () => {
      const result = createScorePolicy(baseParams);
      if (!result.ok) return;
      expect(getWeightForDimension(result.value, "direction")).toBe(0.4);
      expect(getWeightForDimension(result.value, "magnitude")).toBe(0.3);
    });

    it("returns 0 when the dimension does not exist", () => {
      const result = createScorePolicy(baseParams);
      if (!result.ok) return;
      expect(getWeightForDimension(result.value, "nonexistent")).toBe(0);
    });
  });

  describe("hydrateScorePolicy", () => {
    it("reconstructs a policy without factory validation", () => {
      const plain = {
        id: "pol_hydrated",
        simulatorId: "str-triage" as const,
        difficulty: "advanced" as const,
        mode: "challenge" as const,
        dimensionConfig: { direction: { weight: 1.0, passingThreshold: 90 } },
        passingScore: 80,
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-02"),
      };
      const policy = hydrateScorePolicy(plain);
      expect(policy.id).toBe("pol_hydrated");
      expect(policy.passingScore).toBe(80);
    });
  });
});

/**
 * ScorePolicy — domain unit tests
 *
 * TDD cycle: verify scoring invariants.
 * - Weights must sum to 1.0
 * - isValidPolicy returns false when invariant is violated
 * - getOverallScore caps result at 0–100
 */

import { describe, expect, it } from "vitest";
import {
  createScorePolicy,
  getOverallScore,
  isPassed,
  isValidPolicy,
  type CreateScorePolicyParams,
} from "../ScorePolicy";
import { Result } from "@/domain/shared/Result";

// Use only dimension names that exist in KNOWN_DIMENSIONS:
// direction | magnitude | dataSufficiency | profitability | explanation
const BASE_PARAMS: CreateScorePolicyParams = {
  id: "test-policy",
  simulatorId: "listing-audit",
  difficulty: "beginner",
  mode: "practice",
  dimensionConfig: {
    direction: { weight: 0.4, passingThreshold: 50 },
    profitability: { weight: 0.4, passingThreshold: 50 },
    dataSufficiency: { weight: 0.2, passingThreshold: 50 },
  },
  passingScore: 60,
};

// ── Weight sum invariant ───────────────────────────────────────────────────────

describe("weight sum invariant", () => {
  it("createScorePolicy accepts weights that sum to 1.0", () => {
    const result = createScorePolicy(BASE_PARAMS);
    expect(result.ok).toBe(true);
  });

  it("createScorePolicy rejects weights that sum to 0.9", () => {
    const params: CreateScorePolicyParams = {
      ...BASE_PARAMS,
      dimensionConfig: {
        direction: { weight: 0.4, passingThreshold: 50 },
        profitability: { weight: 0.3, passingThreshold: 50 },
        dataSufficiency: { weight: 0.2, passingThreshold: 50 }, // 0.4+0.3+0.2 = 0.9 ≠ 1.0
      },
    };
    const result = createScorePolicy(params);
    expect(result.ok).toBe(false);
    if (Result.isErr(result)) {
      expect(result.error.kind).toBe("invalid_weight_sum");
      expect((result.error as { kind: "invalid_weight_sum"; total: number }).total).toBeCloseTo(
        0.9,
        2,
      );
    }
  });

  it("createScorePolicy rejects weights that sum to 1.1", () => {
    const params: CreateScorePolicyParams = {
      ...BASE_PARAMS,
      dimensionConfig: {
        direction: { weight: 0.5, passingThreshold: 50 },
        profitability: { weight: 0.4, passingThreshold: 50 },
        dataSufficiency: { weight: 0.2, passingThreshold: 50 }, // 0.5+0.4+0.2 = 1.1
      },
    };
    const result = createScorePolicy(params);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("invalid_weight_sum");
    }
  });

  it("isValidPolicy returns false when persisted policy weights sum to 0.9", () => {
    // Simulates a policy seeded by the script (bypasses factory validation)
    const badPolicy = {
      id: "bad-policy",
      simulatorId: "listing-audit" as const,
      difficulty: "beginner" as const,
      mode: "practice" as const,
      dimensionConfig: {
        direction: { weight: 0.4, passingThreshold: 70 },
        profitability: { weight: 0.4, passingThreshold: 70 },
        explanation: { weight: 0.1, passingThreshold: 70 }, // 0.9 — bad
      },
      passingScore: 70,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(isValidPolicy(badPolicy)).toBe(false);
  });

  it("isValidPolicy returns true when persisted policy weights sum to 1.0", () => {
    const goodPolicy = {
      id: "good-policy",
      simulatorId: "listing-audit" as const,
      difficulty: "beginner" as const,
      mode: "practice" as const,
      dimensionConfig: {
        direction: { weight: 0.4, passingThreshold: 70 },
        profitability: { weight: 0.4, passingThreshold: 70 },
        dataSufficiency: { weight: 0.2, passingThreshold: 70 }, // 1.0
      },
      passingScore: 70,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(isValidPolicy(goodPolicy)).toBe(true);
  });
});

// ── getOverallScore ───────────────────────────────────────────────────────────

describe("getOverallScore", () => {
  it("caps overall score at 100 even when dimension scores would exceed 100", () => {
    const policy = createScorePolicy(BASE_PARAMS);
    expect(policy.ok).toBe(true);
    if (!policy.ok) return;

    const dimensions = { direction: 100, profitability: 100, dataSufficiency: 100 };
    const score = getOverallScore(dimensions, policy.value);
    expect(score).toBe(100);
  });

  it("floors overall score at 0 when all dimension scores are negative", () => {
    const policy = createScorePolicy(BASE_PARAMS);
    expect(policy.ok).toBe(true);
    if (!policy.ok) return;

    // All negative — Math.max(0, ...) clamps each to 0, total = 0
    const dimensions = { direction: -50, profitability: -20, dataSufficiency: -10 };
    const score = getOverallScore(dimensions, policy.value);
    expect(score).toBe(0);
  });

  it("handles missing dimensions (they contribute 0)", () => {
    const policy = createScorePolicy(BASE_PARAMS);
    expect(policy.ok).toBe(true);
    if (!policy.ok) return;

    // Only direction provided — 0.4 weight
    const dimensions = { direction: 100 };
    const score = getOverallScore(dimensions, policy.value);
    expect(score).toBe(40); // 100 * 0.4 = 40
  });

  it("isPassed returns true when score meets passing threshold", () => {
    const policy = createScorePolicy(BASE_PARAMS);
    expect(policy.ok).toBe(true);
    if (!policy.ok) return;

    const dimensions = { direction: 100, profitability: 100, dataSufficiency: 100 };
    const score = getOverallScore(dimensions, policy.value);
    expect(isPassed(score, policy.value)).toBe(true);
  });

  it("isPassed returns false when score is below passing threshold", () => {
    const policy = createScorePolicy(BASE_PARAMS);
    expect(policy.ok).toBe(true);
    if (!policy.ok) return;

    const dimensions = { direction: 30, profitability: 30, dataSufficiency: 30 };
    const score = getOverallScore(dimensions, policy.value);
    expect(isPassed(score, policy.value)).toBe(false);
  });
});

// ── Unknown dimension rejection ────────────────────────────────────────────────

describe("unknown dimension names", () => {
  it("createScorePolicy rejects unknown dimension names", () => {
    const params: CreateScorePolicyParams = {
      ...BASE_PARAMS,
      dimensionConfig: {
        direction: { weight: 0.5, passingThreshold: 50 },
        madeUpDimension: { weight: 0.5, passingThreshold: 50 }, // invalid
      },
    };
    const result = createScorePolicy(params);
    expect(result.ok).toBe(false);
    if (Result.isErr(result)) {
      expect(result.error.kind).toBe("unknown_dimension");
      expect((result.error as { kind: "unknown_dimension"; dimension: string }).dimension).toBe(
        "madeUpDimension",
      );
    }
  });

  it("isValidPolicy returns false for unknown dimension names", () => {
    const badPolicy = {
      id: "bad-dim-policy",
      simulatorId: "listing-audit" as const,
      difficulty: "beginner" as const,
      mode: "practice" as const,
      dimensionConfig: {
        direction: { weight: 0.5, passingThreshold: 50 },
        fakeDimension: { weight: 0.5, passingThreshold: 50 },
      },
      passingScore: 60,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(isValidPolicy(badPolicy)).toBe(false);
  });
});

import { describe, it, expect } from "vitest";
import {
  createScorePolicy,
  isValidPolicy,
  hydrateScorePolicy,
  type DimensionConfig,
} from "@/domain/entities/ScorePolicy";
const base = {
  id: "p",
  simulatorId: "bid-elevator" as never,
  difficulty: "beginner" as never,
  mode: "practice" as never,
  passingScore: 50,
};
describe("STORY-074 guard rails", () => {
  it("rejects the exact 0.90-weight bug that shipped", () => {
    const r = createScorePolicy({
      ...base,
      dimensionConfig: {
        bidAccuracy: { weight: 0.4 },
        budgetAdherence: { weight: 0.3 },
        roasHit: { weight: 0.2 },
      },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("invalid_weight_sum");
  });
  it("accepts the dimensions the seed actually uses (they were NOT in KNOWN_DIMENSIONS before)", () => {
    const configs: Record<string, DimensionConfig>[] = [
      {
        bidAccuracy: { weight: 0.45 },
        budgetAdherence: { weight: 0.33 },
        roasHit: { weight: 0.22 },
      },
      {
        structureQuality: { weight: 0.45 },
        budgetAllocation: { weight: 0.33 },
        keywordRelevance: { weight: 0.22 },
      },
      { direction: { weight: 0.6 }, priorityCoverage: { weight: 0.4 } },
      { direction: { weight: 0.5 }, profitability: { weight: 0.5 } },
    ];
    for (const cfg of configs) {
      const r = createScorePolicy({ ...base, dimensionConfig: cfg });
      expect(r.ok, JSON.stringify(cfg)).toBe(true);
    }
  });
  it("refuses to grade completion or the removed explanation dimension", () => {
    for (const dim of ["reviewCoverage", "explanation"]) {
      const r = createScorePolicy({ ...base, dimensionConfig: { [dim]: { weight: 1.0 } } });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.kind).toBe("non_gradable_dimension");
    }
  });
  it("isValidPolicy catches a bad persisted policy at hydration", () => {
    const bad = hydrateScorePolicy({
      ...base,
      dimensionConfig: { explanation: { weight: 1.0 } },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    expect(isValidPolicy(bad)).toBe(false);
    const alsoBad = hydrateScorePolicy({
      ...base,
      dimensionConfig: { direction: { weight: 0.9 } },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    expect(isValidPolicy(alsoBad)).toBe(false);
  });
});

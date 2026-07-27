/**
 * Validates that every policy in scripts/seed-simulator-policies.ts
 * passes isValidPolicy (weights sum to 1.0, all dimensions are known).
 *
 * Run:  node_modules\.bin\vitest run tests/unit/scripts/seed-simulator-policies.test.ts
 */

import { describe, expect, it } from "vitest";
import { isValidPolicy } from "@/domain/entities/ScorePolicy";
import type { SimulatorId } from "@/domain/entities/SimulatorScenario";
import type { Difficulty, SimulatorMode } from "@/domain/entities/SimulatorAttempt";

// Mirror the exact policy definitions from scripts/seed-simulator-policies.ts
const POLICIES: {
  id: string;
  simulatorId: SimulatorId;
  difficulty: Difficulty;
  mode: SimulatorMode;
  dimensionConfig: Record<string, { weight: number; passingThreshold: number }>;
  passingScore: number;
}[] = [
  // Bid Elevator
  {
    id: "policy-bid-elevator-beginner-practice",
    simulatorId: "bid-elevator",
    difficulty: "beginner",
    mode: "practice",
    dimensionConfig: {
      bidAccuracy: { weight: 0.4, passingThreshold: 50 },
      budgetAdherence: { weight: 0.3, passingThreshold: 50 },
      roasHit: { weight: 0.2, passingThreshold: 50 },
      explanation: { weight: 0.1, passingThreshold: 50 },
    },
    passingScore: 50,
  },
  {
    id: "policy-bid-elevator-beginner-credential",
    simulatorId: "bid-elevator",
    difficulty: "beginner",
    mode: "credential",
    dimensionConfig: {
      bidAccuracy: { weight: 0.4, passingThreshold: 65 },
      budgetAdherence: { weight: 0.3, passingThreshold: 65 },
      roasHit: { weight: 0.2, passingThreshold: 65 },
      explanation: { weight: 0.1, passingThreshold: 60 },
    },
    passingScore: 65,
  },
  {
    id: "policy-bid-elevator-intermediate-practice",
    simulatorId: "bid-elevator",
    difficulty: "intermediate",
    mode: "practice",
    dimensionConfig: {
      bidAccuracy: { weight: 0.4, passingThreshold: 65 },
      budgetAdherence: { weight: 0.3, passingThreshold: 65 },
      roasHit: { weight: 0.2, passingThreshold: 65 },
      explanation: { weight: 0.1, passingThreshold: 65 },
    },
    passingScore: 65,
  },
  {
    id: "policy-bid-elevator-advanced-practice",
    simulatorId: "bid-elevator",
    difficulty: "advanced",
    mode: "practice",
    dimensionConfig: {
      bidAccuracy: { weight: 0.4, passingThreshold: 80 },
      budgetAdherence: { weight: 0.3, passingThreshold: 80 },
      roasHit: { weight: 0.2, passingThreshold: 80 },
      explanation: { weight: 0.1, passingThreshold: 70 },
    },
    passingScore: 80,
  },

  // STR Triage
  {
    id: "policy-str-triage-beginner-practice",
    simulatorId: "str-triage",
    difficulty: "beginner",
    mode: "practice",
    dimensionConfig: {
      direction: { weight: 0.4, passingThreshold: 70 },
      profitability: { weight: 0.4, passingThreshold: 70 },
      dataSufficiency: { weight: 0.2, passingThreshold: 70 },
    },
    passingScore: 70,
  },
  {
    id: "policy-str-triage-beginner-credential",
    simulatorId: "str-triage",
    difficulty: "beginner",
    mode: "credential",
    dimensionConfig: {
      direction: { weight: 0.3, passingThreshold: 75 },
      profitability: { weight: 0.4, passingThreshold: 75 },
      dataSufficiency: { weight: 0.2, passingThreshold: 75 },
      explanation: { weight: 0.1, passingThreshold: 70 },
    },
    passingScore: 75,
  },
  {
    id: "policy-str-triage-intermediate-practice",
    simulatorId: "str-triage",
    difficulty: "intermediate",
    mode: "practice",
    dimensionConfig: {
      direction: { weight: 0.3, passingThreshold: 72 },
      profitability: { weight: 0.5, passingThreshold: 72 },
      dataSufficiency: { weight: 0.1, passingThreshold: 72 },
      explanation: { weight: 0.1, passingThreshold: 72 },
    },
    passingScore: 72,
  },
  {
    id: "policy-str-triage-advanced-practice",
    simulatorId: "str-triage",
    difficulty: "advanced",
    mode: "practice",
    dimensionConfig: {
      direction: { weight: 0.3, passingThreshold: 75 },
      profitability: { weight: 0.5, passingThreshold: 75 },
      dataSufficiency: { weight: 0.1, passingThreshold: 72 },
      explanation: { weight: 0.1, passingThreshold: 70 },
    },
    passingScore: 75,
  },

  // Campaign Builder
  {
    id: "policy-campaign-builder-beginner-practice",
    simulatorId: "campaign-builder",
    difficulty: "beginner",
    mode: "practice",
    dimensionConfig: {
      structureQuality: { weight: 0.4, passingThreshold: 50 },
      budgetAllocation: { weight: 0.3, passingThreshold: 50 },
      keywordRelevance: { weight: 0.2, passingThreshold: 50 },
      explanation: { weight: 0.1, passingThreshold: 50 },
    },
    passingScore: 50,
  },
  {
    id: "policy-campaign-builder-intermediate-practice",
    simulatorId: "campaign-builder",
    difficulty: "intermediate",
    mode: "practice",
    dimensionConfig: {
      structureQuality: { weight: 0.4, passingThreshold: 65 },
      budgetAllocation: { weight: 0.3, passingThreshold: 65 },
      keywordRelevance: { weight: 0.2, passingThreshold: 65 },
      explanation: { weight: 0.1, passingThreshold: 65 },
    },
    passingScore: 65,
  },
  {
    id: "policy-campaign-builder-advanced-practice",
    simulatorId: "campaign-builder",
    difficulty: "advanced",
    mode: "practice",
    dimensionConfig: {
      structureQuality: { weight: 0.4, passingThreshold: 80 },
      budgetAllocation: { weight: 0.3, passingThreshold: 80 },
      keywordRelevance: { weight: 0.2, passingThreshold: 80 },
      explanation: { weight: 0.1, passingThreshold: 70 },
    },
    passingScore: 80,
  },

  // Listing Audit
  {
    id: "policy-listing-audit-beginner-practice",
    simulatorId: "listing-audit",
    difficulty: "beginner",
    mode: "practice",
    dimensionConfig: {
      direction: { weight: 0.4, passingThreshold: 70 },
      dataSufficiency: { weight: 0.4, passingThreshold: 70 },
      explanation: { weight: 0.2, passingThreshold: 70 },
    },
    passingScore: 70,
  },
  {
    id: "policy-listing-audit-intermediate-practice",
    simulatorId: "listing-audit",
    difficulty: "intermediate",
    mode: "practice",
    dimensionConfig: {
      direction: { weight: 0.35, passingThreshold: 72 },
      dataSufficiency: { weight: 0.35, passingThreshold: 72 },
      profitability: { weight: 0.15, passingThreshold: 70 },
      explanation: { weight: 0.15, passingThreshold: 70 },
    },
    passingScore: 72,
  },
  {
    id: "policy-listing-audit-advanced-practice",
    simulatorId: "listing-audit",
    difficulty: "advanced",
    mode: "practice",
    dimensionConfig: {
      direction: { weight: 0.3, passingThreshold: 75 },
      dataSufficiency: { weight: 0.25, passingThreshold: 75 },
      profitability: { weight: 0.2, passingThreshold: 72 },
      explanation: { weight: 0.25, passingThreshold: 72 },
    },
    passingScore: 75,
  },
];

describe("seed-simulator-policies.ts policy definitions", () => {
  it.each(POLICIES)(
    "$id: weights must sum to 1.0 and all dimension names must be known",
    ({ dimensionConfig, ...rest }) => {
      const policy = {
        ...rest,
        dimensionConfig,
        passingScore: rest.passingScore,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const valid = isValidPolicy(policy);

      const weights = Object.values(dimensionConfig)
        .reduce((sum, c) => sum + c.weight, 0)
        .toFixed(2);
      const dims = Object.keys(dimensionConfig);

      expect(valid, `weights=${weights} dims=[${dims.join(", ")}]`).toBe(true);
    },
  );
});

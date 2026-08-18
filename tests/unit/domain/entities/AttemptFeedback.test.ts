/**
 * AttemptFeedback domain tests.
 *
 * STORY-066: Feedback Composer + Remediation Recommendations.
 */

import { describe, it, expect } from "vitest";
import {
  composeAttemptFeedback,
  hydrateAttemptFeedback,
  type AttemptFeedback,
  type DimensionFeedback,
  type FeedbackVerdict,
} from "@/domain/entities/AttemptFeedback";
import type { ScorePolicy } from "@/domain/entities/ScorePolicy";

// ── Test fixtures ───────────────────────────────────────────────────────

const BASE_SCORE_POLICY: ScorePolicy = {
  id: "policy-1",
  simulatorId: "bid-elevator",
  difficulty: "beginner",
  mode: "practice",
  dimensionConfig: {
    direction: { weight: 0.3 },
    magnitude: { weight: 0.3 },
    profitability: { weight: 0.4 },
  },
  passingScore: 70,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeAttempt(
  overrides: Partial<{
    score: number | null;
    scoreDimensions: Record<string, number> | null;
    simulatorId: string;
    difficulty: string;
    mode: string;
  }> = {},
): ScorePolicy extends infer P ? Parameters<typeof composeAttemptFeedback>[0]["attempt"] : never {
  return {
    id: "attempt-1",
    userId: "user-1",
    simulatorId: "bid-elevator",
    scenarioId: "scenario-1",
    difficulty: "beginner",
    mode: "practice",
    decisions: [],
    score: 0,
    scoreDimensions: {},
    ...overrides,
  } as never;
}

// ── Tests ─────────────────────────────────────────────────────────────

describe("AttemptFeedback domain", () => {
  describe("composeAttemptFeedback", () => {
    it("generates feedback for a passing attempt", () => {
      const attempt = makeAttempt({
        score: 85,
        scoreDimensions: { direction: 90, magnitude: 80, profitability: 85 },
      });
      const result = composeAttemptFeedback({ attempt, policy: BASE_SCORE_POLICY });

      expect(result.passed).toBe(true);
      expect(result.overallScore).toBe(85);
      expect(result.attemptId).toBe("attempt-1");
      expect(result.userId).toBe("user-1");
      expect(result.simulatorId).toBe("bid-elevator");
    });

    it("generates feedback for a failing attempt", () => {
      const attempt = makeAttempt({
        score: 45,
        scoreDimensions: { direction: 40, magnitude: 50, profitability: 45 },
      });
      const result = composeAttemptFeedback({ attempt, policy: BASE_SCORE_POLICY });

      expect(result.passed).toBe(false);
      expect(result.overallScore).toBe(45);
    });

    it("assigns excellent verdict for scores 90-100", () => {
      const attempt = makeAttempt({
        score: 95,
        scoreDimensions: { direction: 95, magnitude: 95, profitability: 95 },
      });
      const result = composeAttemptFeedback({ attempt, policy: BASE_SCORE_POLICY });

      for (const dim of result.dimensionFeedback) {
        expect(dim.verdict).toBe("excellent");
      }
    });

    it("assigns good verdict for scores 70-89", () => {
      const attempt = makeAttempt({
        score: 75,
        scoreDimensions: { direction: 75, magnitude: 75, profitability: 75 },
      });
      const result = composeAttemptFeedback({ attempt, policy: BASE_SCORE_POLICY });

      for (const dim of result.dimensionFeedback) {
        expect(dim.verdict).toBe("good");
      }
    });

    it("assigns fair verdict for scores 50-69", () => {
      const attempt = makeAttempt({
        score: 60,
        scoreDimensions: { direction: 60, magnitude: 60, profitability: 60 },
      });
      const result = composeAttemptFeedback({ attempt, policy: BASE_SCORE_POLICY });

      for (const dim of result.dimensionFeedback) {
        expect(dim.verdict).toBe("fair");
      }
    });

    it("assigns poor verdict for scores 0-49", () => {
      const attempt = makeAttempt({
        score: 30,
        scoreDimensions: { direction: 30, magnitude: 30, profitability: 30 },
      });
      const result = composeAttemptFeedback({ attempt, policy: BASE_SCORE_POLICY });

      for (const dim of result.dimensionFeedback) {
        expect(dim.verdict).toBe("poor");
      }
    });

    it("passed === true when score >= policy.passingScore", () => {
      const attempt = makeAttempt({
        score: 70,
        scoreDimensions: { direction: 70, magnitude: 70, profitability: 70 },
      });
      const result = composeAttemptFeedback({ attempt, policy: BASE_SCORE_POLICY });
      expect(result.passed).toBe(true);
    });

    it("passed === false when score < policy.passingScore", () => {
      const attempt = makeAttempt({
        score: 69,
        scoreDimensions: { direction: 69, magnitude: 69, profitability: 69 },
      });
      const result = composeAttemptFeedback({ attempt, policy: BASE_SCORE_POLICY });
      expect(result.passed).toBe(false);
    });

    it("overall comment references the simulator name", () => {
      const attempt = makeAttempt({
        score: 85,
        scoreDimensions: { direction: 90, magnitude: 80, profitability: 85 },
      });
      const result = composeAttemptFeedback({ attempt, policy: BASE_SCORE_POLICY });
      expect(result.overallComment).toBeTruthy();
      expect(result.overallComment.length).toBeGreaterThan(0);
    });

    it("keeps generated feedback in the student voice", () => {
      const attempt = makeAttempt({
        score: 65,
        scoreDimensions: {
          bidAccuracy: 65,
          budgetAdherence: 65,
          roasHit: 65,
        },
      });
      const result = composeAttemptFeedback({ attempt, policy: BASE_SCORE_POLICY });
      const renderedCopy = [
        result.overallComment,
        ...result.dimensionFeedback.flatMap((dimension) => [
          dimension.comment,
          dimension.recommendation,
        ]),
      ].join(" ");

      expect(renderedCopy).not.toMatch(/[—–]/);
      expect(renderedCopy).not.toMatch(/\b(Impressive work|Good effort)\b/);
    });

    it("remediationLinks is empty when not passed and no poor dimensions", () => {
      const attempt = makeAttempt({
        score: 55,
        scoreDimensions: { direction: 55, magnitude: 55, profitability: 55 },
      });
      const result = composeAttemptFeedback({ attempt, policy: BASE_SCORE_POLICY });
      // fair verdict -> no links shown until improved to poor
      expect(Array.isArray(result.remediationLinks)).toBe(true);
    });

    it("remediationLinks includes links when passed", () => {
      const attempt = makeAttempt({
        score: 90,
        scoreDimensions: { direction: 90, magnitude: 90, profitability: 90 },
      });
      const result = composeAttemptFeedback({ attempt, policy: BASE_SCORE_POLICY });
      expect(result.remediationLinks.length).toBeGreaterThan(0);
    });

    it("dimensionFeedback array matches keys in scoreDimensions", () => {
      const attempt = makeAttempt({
        score: 80,
        scoreDimensions: { direction: 80, magnitude: 80, profitability: 80 },
      });
      const result = composeAttemptFeedback({ attempt, policy: BASE_SCORE_POLICY });

      expect(result.dimensionFeedback.length).toBe(3);
      const dimNames = result.dimensionFeedback.map((d) => d.dimension).sort();
      expect(dimNames).toEqual(["direction", "magnitude", "profitability"]);
    });

    it("each DimensionFeedback has non-empty comment", () => {
      const attempt = makeAttempt({
        score: 75,
        scoreDimensions: { direction: 75, magnitude: 75, profitability: 75 },
      });
      const result = composeAttemptFeedback({ attempt, policy: BASE_SCORE_POLICY });

      for (const dim of result.dimensionFeedback) {
        expect(dim.comment).toBeTruthy();
        expect(dim.comment.length).toBeGreaterThan(0);
      }
    });

    it("each DimensionFeedback has non-empty recommendation", () => {
      const attempt = makeAttempt({
        score: 40,
        scoreDimensions: { direction: 40, magnitude: 40, profitability: 40 },
      });
      const result = composeAttemptFeedback({ attempt, policy: BASE_SCORE_POLICY });

      for (const dim of result.dimensionFeedback) {
        expect(dim.recommendation).toBeTruthy();
        expect(dim.recommendation.length).toBeGreaterThan(0);
      }
    });

    // STORY-087: pins real, per-simulator business-impact copy for every
    // dimension name each simulator's ScoreDimensions type actually
    // produces today. Regression guard against the bug this story fixed:
    // the template table used to be keyed to dimension names (magnitude,
    // dataSufficiency, explanation, a bid-elevator-flavored "direction")
    // that STORY-071/072/076 renamed or removed, so every real dimension
    // except str-triage's `profitability` silently fell through to the
    // generic "Score of X on Y" fallback.
    const REAL_DIMENSION_NAMES = [
      "bidAccuracy", // bid-elevator
      "budgetAdherence", // bid-elevator
      "roasHit", // bid-elevator
      "structureQuality", // campaign-builder
      "budgetAllocation", // campaign-builder
      "keywordRelevance", // campaign-builder
      "negativeRouting", // campaign-builder (STORY-084)
      "brandedIsolation", // campaign-builder (STORY-084)
      "duplicateControl", // campaign-builder (STORY-084)
      "namingCompliance", // campaign-builder (STORY-084)
      "intentAccuracy", // keyword-research
      "negativeIdentification", // keyword-research
      "direction", // str-triage, listing-audit
      "profitability", // str-triage
      "priorityCoverage", // listing-audit
    ];

    it.each(REAL_DIMENSION_NAMES)(
      "has real business-impact copy for '%s', not the generic fallback",
      (dimension) => {
        const attempt = makeAttempt({
          score: 65,
          scoreDimensions: { [dimension]: 65 },
        });
        const result = composeAttemptFeedback({ attempt, policy: BASE_SCORE_POLICY });

        const feedback = result.dimensionFeedback.find((d) => d.dimension === dimension);
        expect(feedback).toBeDefined();
        expect(feedback!.comment).not.toBe(`Score of 65 on ${dimension}.`);
        expect(feedback!.comment).toContain("65");
        expect(feedback!.recommendation).not.toBe(
          `Review your approach to ${dimension} and practice with simpler scenarios.`,
        );
      },
    );

    it("missing dimensions are omitted from dimensionFeedback", () => {
      const attempt = makeAttempt({
        score: 80,
        scoreDimensions: { direction: 80 },
      });
      const result = composeAttemptFeedback({ attempt, policy: BASE_SCORE_POLICY });

      expect(result.dimensionFeedback.length).toBe(1);
      expect(result.dimensionFeedback[0]!.dimension).toBe("direction");
    });

    it("handles empty decisions array gracefully", () => {
      const attempt = makeAttempt({
        score: 85,
        scoreDimensions: { direction: 90, magnitude: 80, profitability: 85 },
      });
      const result = composeAttemptFeedback({ attempt, policy: BASE_SCORE_POLICY });

      expect(result.passed).toBe(true);
      expect(result.overallScore).toBe(85);
    });

    it("composeAttemptFeedback with intermediate difficulty", () => {
      const policy: ScorePolicy = {
        ...BASE_SCORE_POLICY,
        difficulty: "intermediate",
        dimensionConfig: {
          direction: { weight: 0.5 },
          profitability: { weight: 0.5 },
        },
      };
      const attempt = makeAttempt({
        difficulty: "intermediate",
        score: 80,
        scoreDimensions: { direction: 80, profitability: 80 },
      });
      const result = composeAttemptFeedback({ attempt, policy });
      expect(result.difficulty).toBe("intermediate");
    });

    it("composeAttemptFeedback with advanced difficulty", () => {
      const policy: ScorePolicy = {
        ...BASE_SCORE_POLICY,
        difficulty: "advanced",
        dimensionConfig: {
          direction: { weight: 0.4 },
          profitability: { weight: 0.6 },
        },
        passingScore: 75,
      };
      const attempt = makeAttempt({
        difficulty: "advanced",
        score: 78,
        scoreDimensions: { direction: 78, profitability: 78 },
      });
      const result = composeAttemptFeedback({ attempt, policy });
      expect(result.passed).toBe(true);
    });

    it("composeAttemptFeedback with credential mode", () => {
      const policy: ScorePolicy = {
        ...BASE_SCORE_POLICY,
        mode: "credential",
        dimensionConfig: {
          direction: { weight: 0.4 },
          profitability: { weight: 0.6 },
        },
        passingScore: 80,
      };
      const attempt = makeAttempt({
        mode: "credential",
        score: 88,
        scoreDimensions: { direction: 88, profitability: 88 },
      });
      const result = composeAttemptFeedback({ attempt, policy });
      expect(result.passed).toBe(true);
      expect(result.mode).toBe("credential");
    });

    it("hydration round-trip preserves all fields", () => {
      const attempt = makeAttempt({
        score: 85,
        scoreDimensions: { direction: 90, magnitude: 80, profitability: 85 },
      });
      const original = composeAttemptFeedback({ attempt, policy: BASE_SCORE_POLICY });
      const rehydrated = hydrateAttemptFeedback({
        ...original,
        completedAt: original.completedAt,
      });

      expect(rehydrated.attemptId).toBe(original.attemptId);
      expect(rehydrated.userId).toBe(original.userId);
      expect(rehydrated.simulatorId).toBe(original.simulatorId);
      expect(rehydrated.overallScore).toBe(original.overallScore);
      expect(rehydrated.passed).toBe(original.passed);
      expect(rehydrated.dimensionFeedback.length).toBe(original.dimensionFeedback.length);
    });
  });
});

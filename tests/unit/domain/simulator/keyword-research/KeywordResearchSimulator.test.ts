import { describe, it, expect } from "vitest";
import { KeywordResearchSimulator } from "@/domain/simulator/keyword-research/KeywordResearchSimulator";
import type { KeywordDataset, KeywordDatasetKeyword } from "@/domain/entities/KeywordDataset";
import type { KeywordUserClassification } from "@/domain/simulator/keyword-research/KeywordResearchInput";

function kw(overrides: Partial<KeywordDatasetKeyword> & { term: string }): KeywordDatasetKeyword {
  return {
    normalizedTerm: overrides.term,
    monthlySearchVolume: 1000,
    competitionIndex: 0.5,
    suggestedBidLow: 0.3,
    suggestedBidMedian: 0.5,
    suggestedBidHigh: 0.8,
    relevanceScore: 0.8,
    intent: "core",
    brandClass: "generic",
    seasonalityIndex: 1.0,
    sourceConfidence: 0.7,
    ...overrides,
  };
}

const DATASET: KeywordDataset = {
  datasetId: "kwds-bamboo-cutting-board",
  version: "2026-07-29-v1",
  marketplace: "US",
  currencyCode: "USD",
  categoryId: "general_home",
  nicheId: "bamboo-cutting-board",
  sourceType: "synthetic_calibrated",
  generatedAt: "2026-07-29T00:00:00.000Z",
  keywords: [
    kw({ term: "bamboo cutting board", intent: "core" }),
    kw({ term: "bamboo cutting board with juice groove", intent: "feature" }),
    kw({ term: "cutting board that doesn't dull knives", intent: "problem" }),
    kw({ term: "cutting board for meal prep", intent: "useCase" }),
    kw({ term: "plastic cutting board", intent: "irrelevant" }),
    kw({ term: "acrylic cutting board", intent: "irrelevant" }),
  ],
};

function classify(
  entries: ReadonlyArray<[string, KeywordUserClassification]>,
): Record<string, KeywordUserClassification> {
  return Object.fromEntries(entries);
}

describe("KeywordResearchSimulator", () => {
  const sim = new KeywordResearchSimulator();

  it("has the expected identity", () => {
    expect(sim.simulatorId).toBe("keyword-research");
    expect(sim.name).toBe("Keyword Research");
  });

  describe("preview (no userClassifications)", () => {
    it("returns ground truth with no grading", async () => {
      const output = await sim.run({ dataset: DATASET });

      expect(output.datasetId).toBe("kwds-bamboo-cutting-board");
      expect(output.datasetVersion).toBe("2026-07-29-v1");
      expect(output.sourceType).toBe("synthetic_calibrated");
      expect(output.categoryId).toBe("general_home");
      expect(output.nicheId).toBe("bamboo-cutting-board");
      expect(output.keywords).toHaveLength(6);
      expect(output.scoreDimensions).toBeNull();
      expect(output.score).toBe(100);

      const core = output.keywords.find((k) => k.term === "bamboo cutting board")!;
      expect(core.groundTruthIntent).toBe("core");
      expect(core.groundTruthIsNegative).toBe(false);
      expect(core.userIntent).toBeUndefined();
      expect(core.isIntentCorrect).toBeUndefined();

      const irrelevant = output.keywords.find((k) => k.term === "plastic cutting board")!;
      expect(irrelevant.groundTruthIsNegative).toBe(true);
    });
  });

  describe("grading", () => {
    it("scores 100/100 when every classification matches ground truth", async () => {
      const userClassifications = classify(
        DATASET.keywords.map((k) => [
          k.normalizedTerm,
          { intent: k.intent, isNegative: k.intent === "irrelevant" },
        ]),
      );

      const output = await sim.run({ dataset: DATASET, userClassifications });

      expect(output.scoreDimensions).toEqual({ intentAccuracy: 100, negativeIdentification: 100 });
      expect(output.score).toBe(100);
      const core = output.keywords.find((k) => k.term === "bamboo cutting board")!;
      expect(core.isIntentCorrect).toBe(true);
      expect(core.userIntent).toBe("core");
    });

    it("scores 0 intentAccuracy when every classification is wrong", async () => {
      const userClassifications = classify(
        DATASET.keywords.map((k) => [
          k.normalizedTerm,
          { intent: "competitor" as const, isNegative: false },
        ]),
      );

      const output = await sim.run({ dataset: DATASET, userClassifications });

      expect(output.scoreDimensions?.intentAccuracy).toBe(0);
    });

    it("treats an unclassified keyword as incorrect (no partial-credit gaming)", async () => {
      const partial = classify(
        DATASET.keywords
          .slice(0, 5)
          .map((k) => [
            k.normalizedTerm,
            { intent: k.intent, isNegative: k.intent === "irrelevant" },
          ]),
      );
      // 6th keyword ("acrylic cutting board", irrelevant) left unclassified.

      const output = await sim.run({ dataset: DATASET, userClassifications: partial });

      expect(output.scoreDimensions?.intentAccuracy).toBe(Math.round((5 / 6) * 100));
    });

    describe("negativeIdentification (F1)", () => {
      it("scores 100 when there are no true negatives and none are flagged", async () => {
        const allRelevant: KeywordDataset = {
          ...DATASET,
          keywords: DATASET.keywords.filter((k) => k.intent !== "irrelevant"),
        };
        const userClassifications = classify(
          allRelevant.keywords.map((k) => [
            k.normalizedTerm,
            { intent: k.intent, isNegative: false },
          ]),
        );

        const output = await sim.run({ dataset: allRelevant, userClassifications });

        expect(output.scoreDimensions?.negativeIdentification).toBe(100);
      });

      it("scores 0 when a keyword is wrongly flagged negative with no true negatives present", async () => {
        const allRelevant: KeywordDataset = {
          ...DATASET,
          keywords: DATASET.keywords.filter((k) => k.intent !== "irrelevant"),
        };
        const userClassifications = classify(
          allRelevant.keywords.map((k, i) => [
            k.normalizedTerm,
            { intent: k.intent, isNegative: i === 0 },
          ]),
        );

        const output = await sim.run({ dataset: allRelevant, userClassifications });

        expect(output.scoreDimensions?.negativeIdentification).toBe(0);
      });

      it("scores 0 recall when true negatives exist but none are caught", async () => {
        const userClassifications = classify(
          DATASET.keywords.map((k) => [k.normalizedTerm, { intent: k.intent, isNegative: false }]),
        );

        const output = await sim.run({ dataset: DATASET, userClassifications });

        expect(output.scoreDimensions?.negativeIdentification).toBe(0);
      });

      it("computes a partial F1 for a mix of correct catches, misses, and false alarms", async () => {
        // Ground truth negatives: "plastic cutting board", "acrylic cutting board".
        // Student: catches "plastic..." (TP), misses "acrylic..." (FN),
        // wrongly flags "bamboo cutting board" (FP).
        const userClassifications = classify(
          DATASET.keywords.map((k) => [
            k.normalizedTerm,
            {
              intent: k.intent,
              isNegative: k.term === "plastic cutting board" || k.term === "bamboo cutting board",
            },
          ]),
        );

        const output = await sim.run({ dataset: DATASET, userClassifications });

        // TP=1, FP=1, FN=1 -> precision=0.5, recall=0.5 -> F1=0.5 -> 50
        expect(output.scoreDimensions?.negativeIdentification).toBe(50);
      });
    });

    it("is deterministic: identical input produces identical output", async () => {
      const userClassifications = classify(
        DATASET.keywords.map((k) => [
          k.normalizedTerm,
          { intent: k.intent, isNegative: k.intent === "irrelevant" },
        ]),
      );

      const first = await sim.run({ dataset: DATASET, userClassifications });
      const second = await sim.run({ dataset: DATASET, userClassifications });

      expect(second).toEqual(first);
    });
  });
});

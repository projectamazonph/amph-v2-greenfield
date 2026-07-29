import { describe, it, expect } from "vitest";
import { StrTriageSimulator } from "@/domain/simulator/str-triage/StrTriageSimulator";
import type {
  StrTriageInput,
  SearchTermRow,
  ExistingTarget,
} from "@/domain/simulator/str-triage/StrTriageInput";

function baseInput(
  rows: readonly SearchTermRow[],
  overrides: Partial<StrTriageInput> = {},
): StrTriageInput {
  return {
    rows,
    averageOrderValue: 30,
    expectedCtrPct: 4, // -> minImpressionsForCtrEvaluation = 250 (floor engaged)
    expectedCvrPct: 5, // -> zeroOrderClickThreshold = 32
    brandTargetRoas: 5, // -> targetCpa = 6
    genericTargetRoas: 3, // -> targetCpa = 10
    competitorTargetRoas: 4, // -> targetCpa = 7.5
    confidenceLevel: 0.8,
    minElapsedDays: 7,
    minOrdersForWinner: 2,
    brandLexicon: ["acme"],
    competitorBrandLexicon: ["rivalco"],
    existingTargets: [],
    sourceCampaignRole: "research",
    ...overrides,
  };
}

function row(searchTerm: string, overrides: Partial<SearchTermRow> = {}): SearchTermRow {
  return {
    searchTerm,
    impressions: 1000,
    clicks: 50,
    spend: 20,
    orders: 0,
    sales: 0,
    elapsedDays: 14,
    sourceCampaignId: "camp-research-1",
    sourceAdGroupId: "ag-1",
    sourceTarget: searchTerm,
    sourceMatchType: "broad",
    ...overrides,
  };
}

describe("StrTriageSimulator", () => {
  const sim = new StrTriageSimulator();

  it("has the expected identity", () => {
    expect(sim.simulatorId).toBe("str-triage");
    expect(sim.name).toBe("STR Triage");
  });

  it("returns an empty result for zero rows", async () => {
    const output = await sim.run(baseInput([]));
    expect(output).toEqual({ classifications: [], scoreDimensions: null, score: 100 });
  });

  describe("insufficient_data", () => {
    it("gates on elapsed days regardless of everything else", async () => {
      const output = await sim.run(
        baseInput([row("kitchen knife set", { orders: 5, sales: 500, elapsedDays: 3 })]),
      );
      expect(output.classifications[0]!.groundTruth).toBe("insufficient_data");
    });

    it("flags too few orders as insufficient rather than guessing", async () => {
      const output = await sim.run(
        baseInput([row("kitchen knife set", { orders: 1, sales: 40, spend: 20 })]),
      );
      expect(output.classifications[0]!.groundTruth).toBe("insufficient_data");
    });

    it("flags zero-order spend below targetCpa as insufficient", async () => {
      const output = await sim.run(
        baseInput([row("random accessory", { spend: 5, clicks: 40, impressions: 300 })]),
      );
      expect(output.classifications[0]!.groundTruth).toBe("insufficient_data");
    });

    it("flags zero-order clicks below the statistical threshold as insufficient", async () => {
      const output = await sim.run(
        baseInput([row("random accessory", { spend: 15, clicks: 20, impressions: 300 })]),
      );
      expect(output.classifications[0]!.groundTruth).toBe("insufficient_data");
    });

    it("flags zero-order impressions below the CTR-evaluation floor as insufficient", async () => {
      const output = await sim.run(
        baseInput([row("random accessory", { spend: 15, clicks: 40, impressions: 100 })]),
      );
      expect(output.classifications[0]!.groundTruth).toBe("insufficient_data");
    });
  });

  describe("winner path", () => {
    it("harvests a fresh winner to exact with no existing target", async () => {
      const output = await sim.run(
        baseInput([row("kitchen knife set", { orders: 3, sales: 120, spend: 20 })]),
      );
      const c = output.classifications[0]!;
      expect(c.groundTruth).toBe("harvest_exact");
      expect(c.roas).toBe(6);
    });

    it("keeps (doesn't duplicate) a winner already Exact somewhere", async () => {
      const existingTargets: ExistingTarget[] = [
        {
          text: "kitchen knife set",
          normalizedText: "kitchen knife set",
          matchType: "exact",
          campaignId: "camp-perf-1",
          adGroupId: "ag-9",
          campaignRole: "performance",
          state: "enabled",
        },
      ];
      const output = await sim.run(
        baseInput([row("kitchen knife set", { orders: 3, sales: 120, spend: 20 })], {
          existingTargets,
        }),
      );
      expect(output.classifications[0]!.groundTruth).toBe("keep");
    });

    it("still harvests to exact when the winner only exists as broad/phrase", async () => {
      const existingTargets: ExistingTarget[] = [
        {
          text: "kitchen knife set",
          normalizedText: "kitchen knife set",
          matchType: "phrase",
          campaignId: "camp-research-1",
          adGroupId: "ag-1",
          campaignRole: "research",
          state: "enabled",
        },
      ];
      const output = await sim.run(
        baseInput([row("kitchen knife set", { orders: 3, sales: 120, spend: 20 })], {
          existingTargets,
        }),
      );
      const c = output.classifications[0]!;
      expect(c.groundTruth).toBe("harvest_exact");
      expect(c.reasoning).toContain("isolated control");
    });

    it("routes a profitable own-brand winner to Defense instead of harvesting in place", async () => {
      const output = await sim.run(
        baseInput([row("acme knife set", { orders: 3, sales: 120, spend: 20 })]),
      );
      const c = output.classifications[0]!;
      expect(c.brandClass).toBe("ownBrand");
      expect(c.groundTruth).toBe("harvest_exact");
      expect(c.routingNote).toContain("Defense");
    });

    it("does not add a routing note when the own-brand winner is already in Defense", async () => {
      const output = await sim.run(
        baseInput([row("acme knife set", { orders: 3, sales: 120, spend: 20 })], {
          sourceCampaignRole: "defense",
        }),
      );
      expect(output.classifications[0]!.routingNote).toBeNull();
    });

    it("pauses a term with enough order evidence but ROAS below target", async () => {
      const output = await sim.run(
        baseInput([row("kitchen knife set", { orders: 2, sales: 40, spend: 20 })]),
      );
      // roas = 2, generic target = 3 -> below target, but orders(2) >= minOrdersForWinner(2)
      expect(output.classifications[0]!.groundTruth).toBe("pause");
    });

    it("requires >= 3 orders for a competitor term even when minOrdersForWinner is lower", async () => {
      const notEnough = await sim.run(
        baseInput([row("rivalco knife set", { orders: 2, sales: 100, spend: 20 })]),
      );
      expect(notEnough.classifications[0]!.groundTruth).toBe("insufficient_data");

      const enough = await sim.run(
        baseInput([row("rivalco knife set", { orders: 3, sales: 150, spend: 20 })]),
      );
      expect(enough.classifications[0]!.groundTruth).toBe("harvest_exact");
    });
  });

  describe("zero-order loser: negative precision", () => {
    it("defaults a single generic confident loser to negative_exact", async () => {
      const output = await sim.run(
        baseInput([row("random accessory", { spend: 15, clicks: 40, impressions: 300 })]),
      );
      const c = output.classifications[0]!;
      expect(c.groundTruth).toBe("negative_exact");
      expect(c.reasoning).toContain("target CPA");
    });

    it("uses negative_phrase for a competitor term to isolate every variation", async () => {
      const output = await sim.run(
        baseInput([row("rivalco gadget", { spend: 15, clicks: 40, impressions: 300 })]),
      );
      const c = output.classifications[0]!;
      expect(c.brandClass).toBe("competitorBrand");
      expect(c.groundTruth).toBe("negative_phrase");
    });

    it("uses negative_phrase for a scenario-authored incompatible attribute", async () => {
      const output = await sim.run(
        baseInput([row("extra small widget", { spend: 15, clicks: 40, impressions: 300 })], {
          incompatibleAttributeLexicon: ["extra small"],
        }),
      );
      expect(output.classifications[0]!.groundTruth).toBe("negative_phrase");
    });

    it("escalates to negative_phrase when >= 3 distinct generic terms share a proven theme", async () => {
      const rows = [
        row("pink phone case", { spend: 15, clicks: 40, impressions: 300 }),
        row("pink laptop sleeve", { spend: 15, clicks: 40, impressions: 300 }),
        row("pink water bottle", { spend: 15, clicks: 40, impressions: 300 }),
        row("unrelated accessory", { spend: 15, clicks: 40, impressions: 300 }),
      ];
      const output = await sim.run(baseInput(rows));

      const pinkResults = output.classifications.filter((c) => c.searchTerm.startsWith("pink"));
      expect(pinkResults).toHaveLength(3);
      for (const c of pinkResults) {
        expect(c.groundTruth).toBe("negative_phrase");
        expect(c.reasoning).toContain("pink");
      }

      const unrelated = output.classifications.find((c) => c.searchTerm === "unrelated accessory")!;
      expect(unrelated.groundTruth).toBe("negative_exact");
    });

    it("does not escalate when only 2 distinct terms share a theme", async () => {
      const rows = [
        row("teal phone case", { spend: 15, clicks: 40, impressions: 300 }),
        row("teal laptop sleeve", { spend: 15, clicks: 40, impressions: 300 }),
      ];
      const output = await sim.run(baseInput(rows));
      for (const c of output.classifications) {
        expect(c.groundTruth).toBe("negative_exact");
      }
    });
  });

  describe("wrong-lane routing", () => {
    it("flags a non-branded term found in a Defense campaign", async () => {
      const output = await sim.run(
        baseInput([row("random accessory", { spend: 15, clicks: 40, impressions: 300 })], {
          sourceCampaignRole: "defense",
        }),
      );
      expect(output.classifications[0]!.routingNote).toContain("Defense");
    });
  });

  describe("brand detection", () => {
    it("matches on whole words only (no substring false positives)", async () => {
      const output = await sim.run(
        baseInput([row("acetone cleaner spray", { spend: 15, clicks: 40, impressions: 300 })], {
          brandLexicon: ["ace"],
        }),
      );
      expect(output.classifications[0]!.brandClass).toBe("generic");
    });
  });

  describe("grading", () => {
    it("computes direction/profitability/reviewCoverage from a worked example", async () => {
      const rows = [
        row("winner term", { orders: 3, sales: 120, spend: 20 }),
        row("loser term", { spend: 15, clicks: 40, impressions: 300 }),
      ];
      const output = await sim.run(
        baseInput(rows, {
          userClassifications: { "winner term": "harvest_exact", "loser term": "keep" },
        }),
      );

      expect(output.scoreDimensions).toEqual({
        direction: 50,
        profitability: 100,
        reviewCoverage: 100,
      });
    });

    it("penalizes profitability for wrongly removing a non-removal-ground-truth term", async () => {
      const rows = [row("winner term", { orders: 3, sales: 100, spend: 20 })];
      const output = await sim.run(
        baseInput(rows, { userClassifications: { "winner term": "pause" } }),
      );
      expect(output.scoreDimensions?.profitability).toBe(0);
    });

    it("is deterministic: identical input produces identical output", async () => {
      const rows = [
        row("winner term", { orders: 3, sales: 120, spend: 20 }),
        row("loser term", { spend: 15, clicks: 40, impressions: 300 }),
        row("pink phone case", { spend: 15, clicks: 40, impressions: 300 }),
        row("pink laptop sleeve", { spend: 15, clicks: 40, impressions: 300 }),
        row("pink water bottle", { spend: 15, clicks: 40, impressions: 300 }),
      ];
      const input = baseInput(rows, {
        userClassifications: {
          "winner term": "harvest_exact",
          "loser term": "negative_exact",
          "pink phone case": "negative_phrase",
        },
      });

      const first = await sim.run(input);
      const second = await sim.run(input);
      expect(second).toEqual(first);
    });
  });
});

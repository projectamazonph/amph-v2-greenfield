import { describe, it, expect } from "vitest";
import {
  ConnectedAccountSimulator,
  __testOnly,
} from "@/domain/simulator/connected-account/ConnectedAccountSimulator";
import type {
  ConnectedAccountBidDecision,
  ConnectedAccountInput,
  ConnectedAccountKeyword,
  ConnectedAccountScenario,
  ConnectedAccountSearchTerm,
  ConnectedAccountTriageAction,
  ConnectedAccountTriageDecision,
} from "@/domain/simulator/connected-account/ConnectedAccountInput";

function kw(
  overrides: Partial<ConnectedAccountKeyword> & { keywordId: string },
): ConnectedAccountKeyword {
  return {
    keyword: `kw-${overrides.keywordId}`,
    matchType: "exact",
    impressions: 1000,
    clicks: 25,
    spendMinor: 2000,
    salesMinor: 10000,
    currentBidMinor: 1500,
    ...overrides,
  };
}

function term(
  overrides: Partial<ConnectedAccountSearchTerm> & { termId: string },
): ConnectedAccountSearchTerm {
  return {
    term: `term-${overrides.termId}`,
    clicks: 5,
    spendMinor: 800,
    salesMinor: 0,
    orders: 0,
    ...overrides,
  };
}

const SCENARIO: ConnectedAccountScenario = {
  campaignName: "SP-ACME-TEST",
  currencyCode: "PHP",
  dailyBudgetMinor: 50000,
  targetAcosPct: 25,
  breakEvenAcosPct: 35,
  revenuePerOrderMinor: 145000,
  keywords: [
    kw({ keywordId: "k1", keyword: "stainless bottle 32oz" }), // winner
    kw({ keywordId: "k2", keyword: "kids bottle", salesMinor: 0 }), // bleeder
    kw({
      keywordId: "k3",
      keyword: "glass bottle",
      impressions: 0,
      clicks: 0,
      spendMinor: 0,
      salesMinor: 0,
    }), // no signal
  ],
  searchTerms: [
    term({ termId: "t1", clicks: 8, spendMinor: 1200, salesMinor: 14500, orders: 1 }), // winner
    term({ termId: "t2", clicks: 3, spendMinor: 480, salesMinor: 0, orders: 0 }), // negate
    term({ termId: "t3", clicks: 1, spendMinor: 120, salesMinor: 0, orders: 0 }), // pause
    term({ termId: "t4", clicks: 0 }), // no signal, keep
  ],
};

describe("ConnectedAccountSimulator", () => {
  const sim = new ConnectedAccountSimulator();

  it("has the expected identity", () => {
    expect(sim.simulatorId).toBe("connected-account");
    expect(sim.name).toBe("Connected Account");
  });

  describe("preview (no decisions)", () => {
    it("returns the snapshot with ground truth and no grading", async () => {
      const output = await sim.run({ scenario: SCENARIO });

      expect(output.campaignName).toBe("SP-ACME-TEST");
      expect(output.currencyCode).toBe("PHP");
      expect(output.targetAcosPct).toBe(25);
      expect(output.keywords).toHaveLength(3);
      expect(output.searchTerms).toHaveLength(4);
      expect(output.scoreDimensions).toBeNull();
      expect(output.score).toBe(100);
    });

    it("flags winner / bleeder per keyword correctly", async () => {
      const output = await sim.run({ scenario: SCENARIO });
      const byId = Object.fromEntries(output.keywords.map((k) => [k.keywordId, k]));
      expect(byId.k1?.isWinner).toBe(true);
      expect(byId.k2?.isBleeder).toBe(true);
      // k3 has zero impressions AND zero clicks AND zero sales —
      // neither winner nor bleeder, the "do nothing" signal.
      expect(byId.k3?.isWinner).toBe(false);
      expect(byId.k3?.isBleeder).toBe(false);
    });

    it("derives ground-truth triage action per search term", async () => {
      const output = await sim.run({ scenario: SCENARIO });
      const byId = Object.fromEntries(output.searchTerms.map((t) => [t.termId, t]));
      expect(byId.t1?.groundTruthAction).toBe("optimize"); // orders > 0, sales > spend
      expect(byId.t2?.groundTruthAction).toBe("negate_exact"); // clicks >= 2, no orders
      expect(byId.t3?.groundTruthAction).toBe("pause"); // 1 click, no orders
      expect(byId.t4?.groundTruthAction).toBe("keep"); // no clicks
    });
  });

  describe("grading (both decisions supplied)", () => {
    it("scores bidAccuracy as the share of keywords landing in the ±5% optimal band", async () => {
      // Compute the actual optimal bids via the simulator's helper so
      // the test is independent of the formula details.
      const k1Optimal = __testOnly.computeOptimalBidMinor(SCENARIO.keywords[0]!, 25);
      const k2Optimal = __testOnly.computeOptimalBidMinor(SCENARIO.keywords[1]!, 25);
      const k3Optimal = __testOnly.computeOptimalBidMinor(SCENARIO.keywords[2]!, 25);
      expect(k1Optimal).toBeGreaterThan(0);
      // k2 is a bleeder (sales == 0) — optimal bid falls back to current.
      expect(k2Optimal).toBe(SCENARIO.keywords[1]!.currentBidMinor);
      // k3 has zero impressions — optimal bid falls back to current.
      expect(k3Optimal).toBe(SCENARIO.keywords[2]!.currentBidMinor);

      const bidDecisions: ConnectedAccountBidDecision[] = [
        { keywordId: "k1", newBidMinor: k1Optimal },
        { keywordId: "k2", newBidMinor: SCENARIO.keywords[1]!.currentBidMinor },
        { keywordId: "k3", newBidMinor: SCENARIO.keywords[2]!.currentBidMinor },
      ];
      const triageDecisions: ConnectedAccountTriageDecision[] = SCENARIO.searchTerms.map((t) => ({
        termId: t.termId,
        action: "keep" as ConnectedAccountTriageAction,
      }));

      const output = await sim.run({
        scenario: SCENARIO,
        bidDecisions,
        triageDecisions,
      });
      expect(output.scoreDimensions).not.toBeNull();
      expect(output.scoreDimensions?.bidAccuracy).toBe(100);
    });

    it("counts bidAccuracy as the share, not the absolute count", async () => {
      // Two out of three keywords in the optimal band should yield
      // bidAccuracy ≈ 67, not 3 or 2.
      const k1Optimal = __testOnly.computeOptimalBidMinor(SCENARIO.keywords[0]!, 25);
      const bidDecisions: ConnectedAccountBidDecision[] = [
        { keywordId: "k1", newBidMinor: k1Optimal },
        { keywordId: "k2", newBidMinor: SCENARIO.keywords[1]!.currentBidMinor },
        // k3 deliberately off-target.
        { keywordId: "k3", newBidMinor: SCENARIO.keywords[2]!.currentBidMinor + 10000 },
      ];
      const triageDecisions: ConnectedAccountTriageDecision[] = SCENARIO.searchTerms.map((t) => ({
        termId: t.termId,
        action: "keep" as ConnectedAccountTriageAction,
      }));

      const output = await sim.run({
        scenario: SCENARIO,
        bidDecisions,
        triageDecisions,
      });
      // k1 and k2 land in the band; k3 is off. 2/3 ≈ 67%.
      expect(output.scoreDimensions?.bidAccuracy).toBe(67);
    });

    it("counts exact-match triage correctly: negate_exact vs negate_phrase are not equivalent", async () => {
      const triageDecisions: ConnectedAccountTriageDecision[] = [
        { termId: "t1", action: "optimize" }, // correct
        { termId: "t2", action: "negate_phrase" }, // wrong (ground truth negate_exact)
        { termId: "t3", action: "pause" }, // correct
        { termId: "t4", action: "keep" }, // correct
      ];
      const bidDecisions: ConnectedAccountBidDecision[] = SCENARIO.keywords.map((k) => ({
        keywordId: k.keywordId,
        newBidMinor: k.currentBidMinor,
      }));

      const output = await sim.run({
        scenario: SCENARIO,
        bidDecisions,
        triageDecisions,
      });
      // 3 out of 4 search terms correct.
      expect(output.scoreDimensions?.triageAccuracy).toBe(75);
    });

    it("uses the mean of dimensions for the legacy flat score", async () => {
      // Force one dimension wrong: pick a deliberately wrong bid for
      // every keyword, then pair with a fully-correct triage.
      // SCENARIO.searchTerms ground truths: t1=optimize, t2=negate_exact,
      // t3=pause, t4=keep. Mirror those to score 100 on triage.
      const triageDecisions: ConnectedAccountTriageDecision[] = [
        { termId: "t1", action: "optimize" },
        { termId: "t2", action: "negate_exact" },
        { termId: "t3", action: "pause" },
        { termId: "t4", action: "keep" },
      ];
      const bidDecisions: ConnectedAccountBidDecision[] = SCENARIO.keywords.map((k) => ({
        keywordId: k.keywordId,
        newBidMinor: k.currentBidMinor + 10000, // way off target for every keyword
      }));

      const output = await sim.run({
        scenario: SCENARIO,
        bidDecisions,
        triageDecisions,
      });
      expect(output.scoreDimensions?.bidAccuracy).toBe(0);
      expect(output.scoreDimensions?.triageAccuracy).toBe(100);
      // Flat score = round((0 + 100) / 2) = 50.
      expect(output.score).toBe(50);
    });

    it("treats negate_exact as ground truth for high-click no-order terms", async () => {
      // Term with 5 clicks and no orders — ground truth is negate_exact,
      // not pause. A user picking pause scores it wrong.
      const scenario: ConnectedAccountScenario = {
        ...SCENARIO,
        searchTerms: [term({ termId: "high-click-no-order", clicks: 5, spendMinor: 500 })],
      };
      const output = await sim.run({
        scenario,
        bidDecisions: SCENARIO.keywords.map((k) => ({
          keywordId: k.keywordId,
          newBidMinor: k.currentBidMinor,
        })),
        triageDecisions: [{ termId: "high-click-no-order", action: "pause" }],
      });
      const termResult = output.searchTerms[0]!;
      expect(termResult.groundTruthAction).toBe("negate_exact");
      expect(termResult.isTriageCorrect).toBe(false);
    });
  });

  describe("registry integration", () => {
    it("is exported from the simulator module index", async () => {
      const index = await import("@/domain/simulator/connected-account");
      expect(typeof index.ConnectedAccountSimulator).toBe("function");
      expect(index.ConnectedAccountSimulator.name).toBe("ConnectedAccountSimulator");
    });
  });
});

describe("ConnectedAccountInput shape", () => {
  it("treats undefined decisions as preview (no grading)", async () => {
    const sim = new ConnectedAccountSimulator();
    const output = await sim.run({ scenario: SCENARIO });
    expect(output.scoreDimensions).toBeNull();
    expect(output.score).toBe(100);
  });

  it("uses partial decisions as preview when only one is supplied", async () => {
    // The simulator's `isGraded` flag requires BOTH decisions. With
    // only one supplied the score is the preview flat 100 and
    // scoreDimensions stays null. The server action's zod schema
    // (`attemptSchema`) requires both arrays via `.min(1).optional()`,
    // so partial decisions cannot actually reach the simulator in
    // production — this test pins the simulator's contract for the
    // hypothetical partial case to prevent silent drift.
    const sim = new ConnectedAccountSimulator();
    const bidDecisions: ConnectedAccountBidDecision[] = SCENARIO.keywords.map((k) => ({
      keywordId: k.keywordId,
      newBidMinor: k.currentBidMinor,
    }));
    const input: ConnectedAccountInput = { scenario: SCENARIO, bidDecisions };
    const output = await sim.run(input);
    expect(output.scoreDimensions).toBeNull();
    expect(output.score).toBe(100);
  });
});

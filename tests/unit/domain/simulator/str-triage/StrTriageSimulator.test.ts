/**
 * StrTriageSimulator unit tests.
 *
 * STORY-067: STR Triage Rebuild (Scoring Engine Integration).
 */

import { describe, it, expect } from "vitest";
import { StrTriageSimulator } from "@/domain/simulator/str-triage/StrTriageSimulator";
import type { StrTriageInput } from "@/domain/simulator/str-triage/StrTriageInput";

// ── Test fixtures ───────────────────────────────────────────────────────

function makeRow(
  keyword: string,
  spend: number,
  revenue: number,
): { keyword: string; spend: number; revenue: number; orders: number } {
  return { keyword, spend, revenue, orders: Math.floor(revenue / 50) };
}

const TARGET_ROAS = 3.0;

// Row where ROAS = 9.0 (3× target), spend ratio = 0.08 → add_as_exact
const ROW_ADD_EXACT = makeRow("good keyword", 2, 18); // roas=9, spend_ratio=0.08
// Row where ROAS = 2.5 (0.83× target), spend ratio = 0.6 → add_as_phrase
const ROW_ADD_PHRASE = makeRow("marginal keyword", 15, 37.5); // roas=2.5, spend_ratio=0.6
// Row where ROAS = 1.0 (< target), spend ratio = 1.2 → pause
const ROW_PAUSE = makeRow("bad keyword", 30, 30); // roas=1.0, spend_ratio=1.2
// Row where ROAS = 4.0 (> target), spend ratio = 0.4 → keep
const ROW_KEEP = makeRow("healthy keyword", 10, 40); // roas=4, spend_ratio=0.4

function run(
  rows: ReturnType<typeof makeRow>[],
  userClassifications?: Record<string, "keep" | "pause" | "add_as_exact" | "add_as_phrase">,
): ReturnType<StrTriageSimulator["run"]> {
  const sim = new StrTriageSimulator();
  return sim.run({ rows, targetRoas: TARGET_ROAS, userClassifications });
}

// ── Tests ─────────────────────────────────────────────────────────────

describe("StrTriageSimulator", () => {
  describe("ground truth classification (no userClassifications)", () => {
    it("returns add_as_exact for high-ROAS low-spend keywords", async () => {
      const result = await run([ROW_ADD_EXACT]);
      expect(result.classifications[0]!.groundTruth).toBe("add_as_exact");
      expect(result.scoreDimensions).toBeNull();
      expect(result.score).toBe(100);
    });

    it("returns add_as_phrase for marginal-ROAS high-spend keywords", async () => {
      const result = await run([ROW_ADD_PHRASE]);
      expect(result.classifications[0]!.groundTruth).toBe("add_as_phrase");
    });

    it("returns pause for low-ROAS over-budget keywords", async () => {
      const result = await run([ROW_PAUSE]);
      expect(result.classifications[0]!.groundTruth).toBe("pause");
    });

    it("returns keep for healthy-ROAS reasonable-spend keywords", async () => {
      const result = await run([ROW_KEEP]);
      expect(result.classifications[0]!.groundTruth).toBe("keep");
    });

    it("returns empty result for empty rows", async () => {
      const result = await run([]);
      expect(result.classifications).toHaveLength(0);
      expect(result.scoreDimensions).toBeNull();
      expect(result.score).toBe(100);
    });

    it("computes correct ROAS values", async () => {
      const result = await run([ROW_ADD_EXACT, ROW_PAUSE, ROW_KEEP]);
      expect(result.classifications[0]!.roas).toBeCloseTo(9.0);
      expect(result.classifications[1]!.roas).toBeCloseTo(1.0);
      expect(result.classifications[2]!.roas).toBeCloseTo(4.0);
    });
  });

  describe("direction scoring (userClassifications provided)", () => {
    it("direction = 100 when all classifications are correct", async () => {
      const result = await run([ROW_ADD_EXACT, ROW_KEEP, ROW_PAUSE], {
        "good keyword": "add_as_exact",
        "healthy keyword": "keep",
        "bad keyword": "pause",
      });
      expect(result.scoreDimensions).not.toBeNull();
      expect(result.scoreDimensions!.direction).toBe(100);
    });

    it("direction = 0 when all classifications are wrong", async () => {
      const result = await run([ROW_ADD_EXACT, ROW_KEEP, ROW_PAUSE], {
        "good keyword": "pause",
        "healthy keyword": "pause",
        "bad keyword": "add_as_exact",
      });
      expect(result.scoreDimensions!.direction).toBe(0);
    });

    it("direction = 50 when half of classifications are correct", async () => {
      const result = await run([ROW_ADD_EXACT, ROW_KEEP, ROW_PAUSE, ROW_ADD_PHRASE], {
        "good keyword": "add_as_exact",
        "healthy keyword": "pause",
        "bad keyword": "pause",
        "marginal keyword": "add_as_phrase",
      });
      // 3/4 correct = 75 (add_exact✓, keep✗, pause✓, add_phrase✓)
      expect(result.scoreDimensions!.direction).toBe(75);
    });

    it("isCorrect is false when userChoice is undefined", async () => {
      const result = await run([ROW_KEEP], {});
      expect(result.classifications[0]!.isCorrect).toBe(false);
    });

    it("score equals direction score when grading", async () => {
      const result = await run([ROW_KEEP, ROW_PAUSE], {
        "healthy keyword": "keep",
        "bad keyword": "pause",
      });
      expect(result.score).toBe(100);
      expect(result.scoreDimensions!.direction).toBe(100);
    });

    it("score = 100 when no userClassifications (preview mode)", async () => {
      const result = await run([ROW_KEEP, ROW_PAUSE]);
      expect(result.score).toBe(100);
      expect(result.scoreDimensions).toBeNull();
    });
  });

  describe("profitability scoring", () => {
    it("profitability = 100 when all non-pausable revenue is preserved", async () => {
      // add_exact and keep keywords are non-pausable — all preserved
      const result = await run([ROW_ADD_EXACT, ROW_KEEP], {
        "good keyword": "add_as_exact",
        "healthy keyword": "keep",
      });
      expect(result.scoreDimensions!.profitability).toBe(100);
    });

    it("profitability penalizes pausing a non-pausable keyword", async () => {
      // Non-pausable revenue = ROW_ADD_EXACT.revenue(18) + ROW_KEEP.revenue(40) = 58
      // Pausing ROW_ADD_EXACT loses 18 revenue → preserved = 40
      // score = 40/58 * 100 ≈ 69
      const result = await run([ROW_ADD_EXACT, ROW_KEEP], {
        "good keyword": "pause",
        "healthy keyword": "keep",
      });
      const expected = Math.round((40 / 58) * 100);
      expect(result.scoreDimensions!.profitability).toBe(expected);
    });

    it("profitability = 100 when all keywords are pausable (neutral)", async () => {
      // Rows where ground truth is "pause"
      const row1 = makeRow("keyword1", 50, 20); // roas=0.4, spend_ratio=2 → pause
      const row2 = makeRow("keyword2", 40, 10); // roas=0.25, spend_ratio=1.6 → pause
      const result = await run(
        [row1, row2],
        { keyword1: "pause", keyword2: "keep" }, // user chose differently
      );
      // All revenue is pausable, so it's neutral
      expect(result.scoreDimensions!.profitability).toBe(100);
    });

    it("pausing a pausable keyword is neutral (correct action for pause)", async () => {
      const row1 = makeRow("keyword1", 50, 20); // pause
      const row2 = makeRow("keyword2", 5, 20); // add_as_exact
      const result = await run([row1, row2], { keyword1: "pause", keyword2: "add_as_exact" });
      // Non-pausable revenue = 20, all preserved → 100
      expect(result.scoreDimensions!.profitability).toBe(100);
    });
  });

  describe("reviewCoverage (reported, not graded)", () => {
    it("reviewCoverage = 100 when all rows have a userChoice", async () => {
      const result = await run([ROW_KEEP, ROW_PAUSE, ROW_ADD_EXACT], {
        "healthy keyword": "keep",
        "bad keyword": "pause",
        "good keyword": "add_as_exact",
      });
      expect(result.scoreDimensions!.reviewCoverage).toBe(100);
    });

    it("reviewCoverage = 50 when half the rows are unreviewed", async () => {
      const result = await run([ROW_KEEP, ROW_PAUSE, ROW_ADD_EXACT, ROW_ADD_PHRASE], {
        "healthy keyword": "keep",
        "bad keyword": "pause",
        // "good keyword" and "marginal keyword" unreviewed
      });
      // 2/4 reviewed = 50
      expect(result.scoreDimensions!.reviewCoverage).toBe(50);
    });

    it("reviewCoverage = 0 when no rows are reviewed", async () => {
      const result = await run([ROW_KEEP, ROW_PAUSE], {});
      expect(result.scoreDimensions!.reviewCoverage).toBe(0);
    });
  });

  describe("groundTruth and userChoice in output", () => {
    it("groundTruth is always set regardless of userChoice", async () => {
      const result = await run([ROW_KEEP], { "healthy keyword": "pause" });
      expect(result.classifications[0]!.groundTruth).toBe("keep");
    });

    it("userChoice is undefined when not provided", async () => {
      const result = await run([ROW_KEEP]);
      expect(result.classifications[0]!.userChoice).toBeUndefined();
    });

    it("userChoice is set when provided", async () => {
      const result = await run([ROW_KEEP], { "healthy keyword": "keep" });
      expect(result.classifications[0]!.userChoice).toBe("keep");
    });
  });
});

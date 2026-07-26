/**
 * ListingAuditSimulator tests — TDD (red first).
 *
 * STORY-040: Listing Audit + Keyword Research simulator.
 */

import { describe, it, expect } from "vitest";
import { ListingAuditSimulator } from "@/domain/simulator/listing-audit/ListingAuditSimulator";
import type { ListingAuditInput } from "@/domain/simulator/listing-audit/ListingAuditInput";

describe("ListingAuditSimulator", () => {
  const simulator = new ListingAuditSimulator();

  it("returns an audit with findings and a keyword list", async () => {
    const input: ListingAuditInput = {
      title: "Running Shoes Men Lightweight Breathable",
      bullets: ["Breathable mesh upper", " cushioned sole", "Durable rubber outsole"],
      description: "Perfect for jogging and training.",
      category: "Shoes & Clothing",
      niche: "running shoes men",
    };

    const result = await simulator.run(input);

    expect(result.audit.titleScore).toBeGreaterThanOrEqual(0);
    expect(result.audit.titleScore).toBeLessThanOrEqual(100);
    expect(result.audit.findings).toBeTruthy();
    expect(result.keywordResearch.keywords.length).toBeGreaterThan(0);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("detects missing keywords in the title", async () => {
    const input: ListingAuditInput = {
      title: "Shoes",
      bullets: [],
      description: "",
      category: "Shoes",
      niche: "running shoes",
    };

    const result = await simulator.run(input);

    // A very short title should have a low score
    expect(result.audit.titleScore).toBeLessThan(80);
    // Should have keyword gap findings
    expect(result.audit.findings.length).toBeGreaterThan(0);
  });

  it("scores an empty listing as 0 across all categories", async () => {
    const input: ListingAuditInput = {
      title: "",
      bullets: [],
      description: "",
      category: "",
      niche: "",
    };

    const result = await simulator.run(input);

    expect(result.audit.titleScore).toBe(0);
    expect(result.score).toBe(0);
    expect(result.keywordResearch.keywords).toHaveLength(0);
  });

  it("generates relevant keywords from the niche", async () => {
    const input: ListingAuditInput = {
      title: "Coffee Beans Organic Dark Roast",
      bullets: ["100% Arabica", "Medium roast"],
      description: "Premium whole bean coffee.",
      category: "Grocery",
      niche: "coffee beans organic",
    };

    const result = await simulator.run(input);

    const keywordTexts = result.keywordResearch.keywords.map((k) => k.keyword.toLowerCase());
    // Keywords should relate to the niche
    expect(keywordTexts.length).toBeGreaterThanOrEqual(5);
    expect(result.keywordResearch.searchVolumeEstimate).toBeGreaterThan(0);
  });

  it("returns findings for each audit category", async () => {
    const input: ListingAuditInput = {
      title: "A product for running",
      bullets: ["One feature", "Another feature"],
      description: "A description of the product.",
      category: "Sports",
      niche: "running",
    };

    const result = await simulator.run(input);

    const findingTypes = new Set(result.audit.findings.map((f) => f.category));
    expect(findingTypes.size).toBeGreaterThan(0);
  });

  it("assigns each finding a stable, unique id", async () => {
    const input: ListingAuditInput = {
      title: "Shoes",
      bullets: [],
      description: "",
      category: "Shoes",
      niche: "running shoes",
    };

    const result = await simulator.run(input);
    const ids = result.audit.findings.map((f) => f.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // ── STORY-070: grading (userFindingActions provided) ──────────────────

  describe("ground-truth triage (no userFindingActions)", () => {
    const input: ListingAuditInput = {
      title: "Shoes",
      bullets: [],
      description: "",
      category: "Shoes",
      niche: "running shoes",
    };

    it("returns null scoreDimensions in preview mode", async () => {
      const result = await simulator.run(input);
      expect(result.scoreDimensions).toBeNull();
    });

    it("populates gradedFindings with groundTruth but no userChoice", async () => {
      const result = await simulator.run(input);
      expect(result.gradedFindings.length).toBe(result.audit.findings.length);
      for (const f of result.gradedFindings) {
        expect(f.userChoice).toBeUndefined();
        expect(f.isCorrect).toBe(false);
        expect(["fix", "skip"]).toContain(f.groundTruth);
      }
    });

    it("groundTruth is 'skip' for info-severity findings and 'fix' otherwise", async () => {
      const result = await simulator.run(input);
      for (const f of result.gradedFindings) {
        expect(f.groundTruth).toBe(f.severity === "info" ? "skip" : "fix");
      }
    });
  });

  describe("direction scoring (userFindingActions provided)", () => {
    const input: ListingAuditInput = {
      title: "Shoes",
      bullets: [],
      description: "",
      category: "Shoes",
      niche: "running shoes",
    };

    it("direction = 100 when every finding is triaged correctly", async () => {
      const preview = await simulator.run(input);
      const userFindingActions = Object.fromEntries(
        preview.gradedFindings.map((f) => [f.id, f.groundTruth]),
      );
      const result = await simulator.run({ ...input, userFindingActions });
      expect(result.scoreDimensions).not.toBeNull();
      expect(result.scoreDimensions!.direction).toBe(100);
    });

    it("direction = 0 when every finding is triaged incorrectly", async () => {
      const preview = await simulator.run(input);
      const userFindingActions: Record<string, "fix" | "skip"> = Object.fromEntries(
        preview.gradedFindings.map((f): [string, "fix" | "skip"] => [
          f.id,
          f.groundTruth === "fix" ? "skip" : "fix",
        ]),
      );
      const result = await simulator.run({ ...input, userFindingActions });
      expect(result.scoreDimensions!.direction).toBe(0);
    });

    it("marks isCorrect true only when userChoice matches groundTruth", async () => {
      const preview = await simulator.run(input);
      const first = preview.gradedFindings[0]!;
      const result = await simulator.run({
        ...input,
        userFindingActions: { [first.id]: first.groundTruth },
      });
      const graded = result.gradedFindings.find((f) => f.id === first.id)!;
      expect(graded.userChoice).toBe(first.groundTruth);
      expect(graded.isCorrect).toBe(true);
    });
  });

  describe("priorityCoverage scoring", () => {
    it("priorityCoverage is NOT 100 when everything is marked fix", async () => {
      // Regression test for STORY-073. This dimension used to be recall
      // only, so "fix everything" scored a guaranteed 100: you cannot miss
      // a must-fix if you fix every finding. It now also weighs precision,
      // so indiscriminate fixing is penalised.
      const input: ListingAuditInput = {
        title: "",
        bullets: [],
        description: "",
        category: "Shoes",
        niche: "shoes",
      };
      const preview = await simulator.run({ ...input, niche: "shoes", title: "x" });
      const skippable = preview.gradedFindings.filter((f) => f.groundTruth === "skip");
      expect(skippable.length).toBeGreaterThan(0); // otherwise the test proves nothing

      const userFindingActions = Object.fromEntries(
        preview.gradedFindings.map((f) => [f.id, "fix" as const]),
      );
      const result = await simulator.run({ ...input, title: "x", userFindingActions });
      expect(result.scoreDimensions!.priorityCoverage).toBeLessThan(100);
    });

    it("priorityCoverage = 100 only when the fix set matches ground truth exactly", async () => {
      const input: ListingAuditInput = {
        title: "x",
        bullets: [],
        description: "",
        category: "Shoes",
        niche: "shoes",
      };
      const preview = await simulator.run(input);
      const userFindingActions = Object.fromEntries(
        preview.gradedFindings.map((f) => [f.id, f.groundTruth]),
      );
      const result = await simulator.run({ ...input, userFindingActions });
      expect(result.scoreDimensions!.priorityCoverage).toBe(100);
    });

    it("priorityCoverage penalizes skipping a must-fix finding", async () => {
      const input: ListingAuditInput = {
        title: "x",
        bullets: [],
        description: "",
        category: "Shoes",
        niche: "shoes",
      };
      const preview = await simulator.run(input);
      const mustFix = preview.gradedFindings.filter((f) => f.groundTruth === "fix");
      expect(mustFix.length).toBeGreaterThan(0);

      // Mark everything "skip" - every must-fix finding is wrongly skipped.
      const userFindingActions = Object.fromEntries(
        preview.gradedFindings.map((f) => [f.id, "skip" as const]),
      );
      const result = await simulator.run({ ...input, userFindingActions });
      expect(result.scoreDimensions!.priorityCoverage).toBe(0);
    });

    it("priorityCoverage = 100 when there are no must-fix findings and none were fixed", async () => {
      const result = await simulator.run({
        title: "",
        bullets: [],
        description: "",
        category: "",
        niche: "",
        userFindingActions: {},
      });
      expect(result.scoreDimensions!.priorityCoverage).toBe(100);
    });
  });

  describe("reviewCoverage (reported, not graded)", () => {
    const input: ListingAuditInput = {
      title: "x",
      bullets: [],
      description: "",
      category: "Shoes",
      niche: "shoes",
    };

    it("reviewCoverage = 100 when every finding has a userChoice", async () => {
      const preview = await simulator.run(input);
      const userFindingActions = Object.fromEntries(
        preview.gradedFindings.map((f) => [f.id, f.groundTruth]),
      );
      const result = await simulator.run({ ...input, userFindingActions });
      expect(result.scoreDimensions!.reviewCoverage).toBe(100);
    });

    it("reviewCoverage = 0 when no findings are reviewed", async () => {
      const result = await simulator.run({ ...input, userFindingActions: {} });
      expect(result.scoreDimensions!.reviewCoverage).toBe(0);
    });
  });

  describe("empty listing", () => {
    it("returns empty gradedFindings and neutral scores when graded", async () => {
      const result = await simulator.run({
        title: "",
        bullets: [],
        description: "",
        category: "",
        niche: "",
        userFindingActions: {},
      });
      expect(result.gradedFindings).toHaveLength(0);
      expect(result.scoreDimensions).toEqual({
        direction: 100,
        priorityCoverage: 100,
        reviewCoverage: 100,
      });
    });
  });
});

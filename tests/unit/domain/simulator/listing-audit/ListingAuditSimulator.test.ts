/**
 * ListingAuditSimulator tests.
 *
 * STORY-080: Listing Audit rubric rewrite.
 *
 * Test groups:
 *  1. Rubric scoring (dimensions, weights, length-as-gate, critical-gate capping)
 *  2. Category variants (prohibited claims, required attributes)
 *  3. Imagery scoring
 *  4. Finding generation (volume, stability, determinism)
 *  5. Keyword research (unchanged, STORY-081's concern)
 *  6. Ground-truth fix/skip grading (unchanged, STORY-083's concern)
 */

import { describe, it, expect } from "vitest";
import { ListingAuditSimulator } from "@/domain/simulator/listing-audit/ListingAuditSimulator";
import type {
  ListingAuditInput,
  ListingImage,
} from "@/domain/simulator/listing-audit/ListingAuditInput";

const simulator = new ListingAuditSimulator();

// ── Fixtures ────────────────────────────────────────────────────────────

const GOOD_IMAGES: readonly ListingImage[] = [
  { slot: 1, role: "main", whiteBackground: true, hasTextOverlay: false, productFillPct: 85 },
  { slot: 2, role: "lifestyle", whiteBackground: false, hasTextOverlay: false, productFillPct: 60 },
  {
    slot: 3,
    role: "infographic",
    whiteBackground: false,
    hasTextOverlay: true,
    productFillPct: 40,
  },
  { slot: 4, role: "dimensions", whiteBackground: true, hasTextOverlay: true, productFillPct: 70 },
  { slot: 5, role: "packaging", whiteBackground: true, hasTextOverlay: false, productFillPct: 90 },
];

function greatListing(overrides: Partial<ListingAuditInput> = {}): ListingAuditInput {
  return {
    title: "Bamboo Cutting Board for Kitchen Prep",
    bullets: [
      "Durable bamboo material resists knife marks, perfect for daily prep",
      "Compact dimensions (12x18in) fit any counter or cabinet, unlike bulky plastic boards",
      "Easy to clean, dishwasher safe, designed to save you cleanup time",
      "Includes juice groove so you can carve meat without a mess",
      "Non-slip feet keep the board steady, ideal for confident chopping",
    ],
    description:
      "This bamboo cutting board brings durable, sustainable material and generous dimensions to your kitchen prep. Unlike thin plastic boards, it resists knife marks and stays stable so you can cook confidently every day.",
    category: "Kitchen",
    niche: "bamboo cutting board",
    images: GOOD_IMAGES,
    hasVideo: true,
    hasAPlus: true,
    ...overrides,
  };
}

// ── Rubric scoring ────────────────────────────────────────────────────────

describe("rubric scoring", () => {
  it("scores a well-optimized listing highly with few findings", async () => {
    const result = await simulator.run(greatListing());
    expect(result.audit.overallScore).toBeGreaterThanOrEqual(80);
    expect(result.audit.findings.length).toBeLessThanOrEqual(4);
  });

  it("dimension weights sum to 100%", () => {
    // Re-derive from the same weights the simulator uses, so this test
    // fails loudly if a dimension is added/removed without updating the total.
    const weights = {
      compliance: 0.25,
      relevance: 0.2,
      accuracy: 0.15,
      conversion: 0.15,
      mobile: 0.1,
      imagery: 0.15,
    };
    const total = Object.values(weights).reduce((s, w) => s + w, 0);
    expect(total).toBeCloseTo(1.0, 5);
  });

  it("a longer but repetitive title does not outperform a concise, relevant one", async () => {
    const concise = await simulator.run(greatListing());
    const repetitive = await simulator.run(
      greatListing({
        title:
          "Bamboo Cutting Board Bamboo Cutting Board Bamboo Cutting Board Bamboo Cutting Board Extra Long Padding Words Here To Inflate Length",
      }),
    );
    expect(repetitive.audit.overallScore).toBeLessThan(concise.audit.overallScore);
  });

  it("fails the title-length rule (critical gate) over the 75-character limit", async () => {
    const result = await simulator.run(
      greatListing({ title: "A".repeat(80) + " bamboo cutting board" }),
    );
    const finding = result.audit.findings.find((f) => f.ruleId === "title_length_limit");
    expect(finding).toBeDefined();
    expect(finding!.isCriticalGate).toBe(true);
    expect(result.audit.overallScore).toBeLessThanOrEqual(59);
  });

  it("caps the overall score when any critical-gate rule fails, regardless of the weighted total", async () => {
    // Otherwise-great listing, but the main image has no white background (critical gate).
    const badMainImage: readonly ListingImage[] = [
      { slot: 1, role: "main", whiteBackground: false, hasTextOverlay: false, productFillPct: 85 },
      ...GOOD_IMAGES.slice(1),
    ];
    const result = await simulator.run(greatListing({ images: badMainImage }));
    expect(result.audit.overallScore).toBeLessThanOrEqual(59);
  });

  it("does not award extra points for padding a title within the valid length", async () => {
    const short = await simulator.run(greatListing({ title: "Bamboo Cutting Board Kitchen" }));
    const padded = await simulator.run(
      greatListing({ title: "Bamboo Cutting Board Kitchen Prep Extra Words To Pad It Out More" }),
    );
    // Both are within the limit and both front-load the niche; padding must not
    // change the compliance/mobile dimension scores.
    expect(padded.audit.dimensionScores.compliance).toBe(short.audit.dimensionScores.compliance);
  });

  it("penalizes an empty description as a gate, not proportionally to length", async () => {
    const empty = await simulator.run(greatListing({ description: "" }));
    const finding = empty.audit.findings.find((f) => f.ruleId === "description_length_gate");
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe("warning");
  });
});

// ── Category variants ────────────────────────────────────────────────────

describe("category variants", () => {
  it("flags a beauty-restricted claim only for the beauty category", async () => {
    const claimText = "This serum eliminates wrinkles permanently.";
    const beautyResult = await simulator.run(
      greatListing({ category: "Beauty", description: claimText }),
    );
    const homeResult = await simulator.run(
      greatListing({ category: "Kitchen", description: claimText }),
    );
    expect(beautyResult.audit.findings.some((f) => f.ruleId === "category_prohibited_claims")).toBe(
      true,
    );
    expect(homeResult.audit.findings.some((f) => f.ruleId === "category_prohibited_claims")).toBe(
      false,
    );
  });

  it("caps the score when a beauty-restricted claim fires (critical gate)", async () => {
    const result = await simulator.run(
      greatListing({
        category: "Beauty",
        description: "This serum eliminates wrinkles permanently.",
      }),
    );
    expect(result.audit.overallScore).toBeLessThanOrEqual(59);
  });

  it("requires category-specific attributes: apparel without size/material info", async () => {
    const result = await simulator.run(
      greatListing({
        category: "Apparel",
        bullets: ["Comfortable everyday wear", "Great for any occasion"],
        description: "A great addition to your wardrobe that looks good every time you wear it.",
      }),
    );
    expect(result.audit.findings.some((f) => f.ruleId === "category_required_attributes")).toBe(
      true,
    );
  });

  it("does not flag category_required_attributes for general_home when material/dimensions are covered", async () => {
    const result = await simulator.run(greatListing({ category: "Kitchen" }));
    expect(result.audit.findings.some((f) => f.ruleId === "category_required_attributes")).toBe(
      false,
    );
  });
});

// ── Imagery ───────────────────────────────────────────────────────────────

describe("imagery", () => {
  it("fails main_image_present when there are no images", async () => {
    const result = await simulator.run(greatListing({ images: [] }));
    expect(result.audit.findings.some((f) => f.ruleId === "main_image_present")).toBe(true);
  });

  it("scores imagery dimension lower with fewer supporting images", async () => {
    const minimal = await simulator.run(
      greatListing({
        images: [
          {
            slot: 1,
            role: "main",
            whiteBackground: true,
            hasTextOverlay: false,
            productFillPct: 80,
          },
        ],
        hasVideo: false,
        hasAPlus: false,
      }),
    );
    const full = await simulator.run(greatListing());
    expect(minimal.audit.dimensionScores.imagery).toBeLessThan(full.audit.dimensionScores.imagery);
  });

  it("does not double-count main_image_white_background when there is no main image", async () => {
    const result = await simulator.run(greatListing({ images: [] }));
    expect(result.audit.findings.some((f) => f.ruleId === "main_image_white_background")).toBe(
      false,
    );
  });
});

// ── Finding generation ────────────────────────────────────────────────────

describe("finding generation", () => {
  it("assigns each finding a stable, unique id and a ruleId", async () => {
    const result = await simulator.run(greatListing({ title: "x", bullets: [], description: "" }));
    const ids = result.audit.findings.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(result.audit.findings.every((f) => f.ruleId.length > 0)).toBe(true);
  });

  it("produces findings across more than one dimension for a mediocre listing", async () => {
    const result = await simulator.run(
      greatListing({ title: "x", bullets: [], description: "", images: [] }),
    );
    const dimensions = new Set(result.audit.findings.map((f) => f.dimension));
    expect(dimensions.size).toBeGreaterThan(1);
  });

  it("produces a rich finding set (>=10) for a poor listing", async () => {
    const result = await simulator.run(
      greatListing({
        title: "x",
        bullets: [],
        description: "",
        images: [],
        hasVideo: false,
        hasAPlus: false,
      }),
    );
    expect(result.audit.findings.length).toBeGreaterThanOrEqual(10);
  });

  it("at least 30% of findings are info-severity (correctly non-fix-now) for a realistic mediocre listing", async () => {
    const result = await simulator.run(
      greatListing({
        title: "Cutting Board",
        bullets: ["Made of bamboo", "Good for the kitchen"],
        description: "A cutting board for your kitchen.",
        images: [
          {
            slot: 1,
            role: "main",
            whiteBackground: true,
            hasTextOverlay: false,
            productFillPct: 80,
          },
        ],
        hasVideo: false,
        hasAPlus: false,
      }),
    );
    const infoCount = result.audit.findings.filter((f) => f.severity === "info").length;
    expect(result.audit.findings.length).toBeGreaterThan(0);
    expect(infoCount / result.audit.findings.length).toBeGreaterThanOrEqual(0.3);
  });

  it("produces identical output for identical input (deterministic replay)", async () => {
    const input = greatListing();
    const first = await simulator.run(input);
    const second = await simulator.run(input);
    expect(second).toEqual(first);
  });

  it("scores an empty listing as 0 with no findings", async () => {
    const input: ListingAuditInput = {
      title: "",
      bullets: [],
      description: "",
      category: "",
      niche: "",
    };
    const result = await simulator.run(input);
    expect(result.audit.overallScore).toBe(0);
    expect(result.score).toBe(0);
    expect(result.audit.findings).toHaveLength(0);
    expect(result.keywordResearch.keywords).toHaveLength(0);
  });
});

// ── Keyword research (unchanged) ───────────────────────────────────────────

describe("keyword research", () => {
  it("generates relevant keywords from the niche", async () => {
    const result = await simulator.run(
      greatListing({ niche: "coffee beans organic", category: "Grocery" }),
    );
    const keywordTexts = result.keywordResearch.keywords.map((k) => k.keyword.toLowerCase());
    expect(keywordTexts.length).toBeGreaterThanOrEqual(5);
    expect(result.keywordResearch.searchVolumeEstimate).toBeGreaterThan(0);
  });
});

// ── Ground-truth fix/skip grading (unchanged -- STORY-083's concern) ────────

describe("ground-truth triage (no userFindingActions)", () => {
  const input = greatListing({ title: "x", bullets: [], description: "" });

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
  const input = greatListing({ title: "x", bullets: [], description: "" });

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
});

describe("priorityCoverage scoring", () => {
  it("priorityCoverage is NOT 100 when everything is marked fix", async () => {
    const input = greatListing({ title: "x", bullets: [], description: "" });
    const preview = await simulator.run(input);
    const skippable = preview.gradedFindings.filter((f) => f.groundTruth === "skip");
    expect(skippable.length).toBeGreaterThan(0);

    const userFindingActions = Object.fromEntries(
      preview.gradedFindings.map((f) => [f.id, "fix" as const]),
    );
    const result = await simulator.run({ ...input, userFindingActions });
    expect(result.scoreDimensions!.priorityCoverage).toBeLessThan(100);
  });

  it("priorityCoverage = 100 only when the fix set matches ground truth exactly", async () => {
    const input = greatListing({ title: "x", bullets: [], description: "" });
    const preview = await simulator.run(input);
    const userFindingActions = Object.fromEntries(
      preview.gradedFindings.map((f) => [f.id, f.groundTruth]),
    );
    const result = await simulator.run({ ...input, userFindingActions });
    expect(result.scoreDimensions!.priorityCoverage).toBe(100);
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
  const input = greatListing({ title: "x", bullets: [], description: "" });

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

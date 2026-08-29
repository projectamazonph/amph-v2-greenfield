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
 *  6. Ground-truth triage (STORY-083): 4-action, context-dependent
 *     resolution replacing the old severity-only fix/skip model.
 */

import { describe, it, expect } from "vitest";
import {
  ListingAuditSimulator,
  DIMENSION_WEIGHTS,
  resolveExpectedAction,
} from "@/domain/simulator/listing-audit/ListingAuditSimulator";
import type { RuleContext } from "@/domain/simulator/listing-audit/ListingAuditSimulator";
import type {
  ListingAuditInput,
  ListingImage,
} from "@/domain/simulator/listing-audit/ListingAuditInput";
import type { AuditFinding } from "@/domain/simulator/listing-audit/ListingAuditOutput";

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
    // Asserts against the simulator's actual exported constant, so this
    // fails loudly if a dimension is added/removed without updating the total.
    const total = Object.values(DIMENSION_WEIGHTS).reduce((s, w) => s + w, 0);
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
  it("does not false-positive on an innocuous word that merely contains a claim term", async () => {
    // "manicures" contains "cures", and a Grocery/general_home listing
    // mentioning "dog treats" is not a medical claim -- neither should
    // trigger the compliance gates.
    const result = await simulator.run(
      greatListing({
        category: "Grocery",
        bullets: [
          ...greatListing().bullets,
          "Comes with a coupon for manicures and healthy dog treats",
        ],
      }),
    );
    expect(result.audit.findings.some((f) => f.ruleId === "prohibited_medical_claims")).toBe(false);
    expect(result.audit.findings.some((f) => f.ruleId === "category_prohibited_claims")).toBe(
      false,
    );
  });

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
    expect(result.audit.findings.every((f) => f.id === `finding-${f.ruleId}`)).toBe(true);
  });

  it("a finding keeps the same id even when an earlier rule's outcome changes", async () => {
    // Regression test: ids used to be positional over the filtered
    // warning/fail list, so fixing an earlier finding (here, the title)
    // shifted every later finding's id. Two runs, same set of remaining
    // problems (bad description, no images), different title.
    const withBadTitle = await simulator.run(
      greatListing({ title: "x", description: "", images: [] }),
    );
    const withGoodTitle = await simulator.run(
      greatListing({ title: "Bamboo Cutting Board for Kitchen Prep", description: "", images: [] }),
    );
    const descriptionFindingBad = withBadTitle.audit.findings.find(
      (f) => f.ruleId === "description_length_gate",
    );
    const descriptionFindingGood = withGoodTitle.audit.findings.find(
      (f) => f.ruleId === "description_length_gate",
    );
    expect(descriptionFindingBad).toBeDefined();
    expect(descriptionFindingGood).toBeDefined();
    expect(descriptionFindingGood!.id).toBe(descriptionFindingBad!.id);
  });

  it("produces findings across more than one dimension for a mediocre listing", async () => {
    const result = await simulator.run(
      greatListing({ title: "x", bullets: [], description: "", images: [] }),
    );
    const dimensions = new Set(result.audit.findings.map((f) => f.dimension));
    expect(dimensions.size).toBeGreaterThan(1);
  });

  it("produces a rich finding set (>=10) for a poor listing with advanced difficulty", async () => {
    const result = await simulator.run(
      greatListing({
        title: "x",
        bullets: [],
        description: "",
        images: [],
        hasVideo: false,
        hasAPlus: false,
        difficulty: "advanced",
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

// ── Ground-truth triage (STORY-083) ─────────────────────────────────────────
//
// `input` below has no structuredAttributes/primaryKeywords/complianceEvidence
// and uses greatListing()'s default 5-image set, so none of the six
// context-dependent skip-case overrides trigger for it -- every finding
// falls through to the severity-informed default resolution. That's a
// deliberate, useful baseline: it isolates "does the default behave
// correctly" from "do the context overrides behave correctly" (tested
// separately below). It produces a mix of info/warning/non-gate-critical
// findings (verified by the "spans more than one action type" test).

const gtInput = greatListing({ title: "x", bullets: [], description: "" });

describe("ground-truth triage (no userFindingActions)", () => {
  it("returns null scoreDimensions in preview mode", async () => {
    const result = await simulator.run(gtInput);
    expect(result.scoreDimensions).toBeNull();
  });

  it("populates gradedFindings with a resolved expectedAction but no userChoice", async () => {
    const result = await simulator.run(gtInput);
    expect(result.gradedFindings.length).toBe(result.audit.findings.length);
    for (const f of result.gradedFindings) {
      expect(f.userChoice).toBeUndefined();
      expect(f.isCorrect).toBe(false);
      expect(["fixNow", "defer", "skip", "escalate"]).toContain(f.expectedAction);
      expect(f.acceptedActions).toContain(f.expectedAction);
      expect(f.rationale.length).toBeGreaterThan(0);
    }
  });

  it("default resolution (no override context) is skip for info, fixNow for warning/critical", async () => {
    const result = await simulator.run(gtInput);
    for (const f of result.gradedFindings) {
      expect(f.expectedAction).toBe(f.severity === "info" ? "skip" : "fixNow");
    }
  });
});

describe("direction scoring (userFindingActions provided)", () => {
  it("direction = 100 when every finding is triaged correctly", async () => {
    const preview = await simulator.run(gtInput);
    const userFindingActions = Object.fromEntries(
      preview.gradedFindings.map((f) => [f.id, f.expectedAction]),
    );
    const result = await simulator.run({ ...gtInput, userFindingActions });
    expect(result.scoreDimensions).not.toBeNull();
    expect(result.scoreDimensions!.direction).toBe(100);
  });

  it("direction = 0 when every finding is triaged with a non-accepted action", async () => {
    const preview = await simulator.run(gtInput);
    const userFindingActions: Record<string, "fixNow" | "skip"> = Object.fromEntries(
      preview.gradedFindings.map((f): [string, "fixNow" | "skip"] => [
        f.id,
        f.expectedAction === "fixNow" ? "skip" : "fixNow",
      ]),
    );
    const result = await simulator.run({ ...gtInput, userFindingActions });
    expect(result.scoreDimensions!.direction).toBe(0);
  });
});

describe("priorityCoverage scoring", () => {
  it("priorityCoverage = 100 only when the fixNow set matches ground truth exactly", async () => {
    const preview = await simulator.run(gtInput);
    const userFindingActions = Object.fromEntries(
      preview.gradedFindings.map((f) => [f.id, f.expectedAction]),
    );
    const result = await simulator.run({ ...gtInput, userFindingActions });
    expect(result.scoreDimensions!.priorityCoverage).toBe(100);
  });

  it("priorityCoverage = 100 when there are no must-fix-now findings and none were fixed", async () => {
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
  it("reviewCoverage = 100 when every finding has a userChoice", async () => {
    const preview = await simulator.run(gtInput);
    const userFindingActions = Object.fromEntries(
      preview.gradedFindings.map((f) => [f.id, f.expectedAction]),
    );
    const result = await simulator.run({ ...gtInput, userFindingActions });
    expect(result.scoreDimensions!.reviewCoverage).toBe(100);
  });

  it("reviewCoverage = 0 when no findings are reviewed", async () => {
    const result = await simulator.run({ ...gtInput, userFindingActions: {} });
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

// ── STORY-083 mandatory regression tests ────────────────────────────────────
// docs/stories/STORY-083.md's five required regressions, proving the
// "mark everything the same action" bypass this story exists to close is
// actually closed.

describe("STORY-083 mandatory regressions", () => {
  it("marking every finding fixNow scores below the beginner passing threshold", async () => {
    const preview = await simulator.run(gtInput);
    const userFindingActions = Object.fromEntries(
      preview.gradedFindings.map((f) => [f.id, "fixNow" as const]),
    );
    const result = await simulator.run({ ...gtInput, userFindingActions });
    // Beginner listing-audit policy passes at direction >= 70
    // (scripts/simulator-policies.ts); blanket fixNow must fail it.
    expect(result.scoreDimensions!.direction).toBeLessThan(70);
  });

  it("marking every finding skip also fails", async () => {
    const preview = await simulator.run(gtInput);
    const userFindingActions = Object.fromEntries(
      preview.gradedFindings.map((f) => [f.id, "skip" as const]),
    );
    const result = await simulator.run({ ...gtInput, userFindingActions });
    expect(result.scoreDimensions!.direction).toBeLessThan(70);
    expect(result.scoreDimensions!.priorityCoverage).toBeLessThan(70);
  });

  it("skipping a required critical fix hurts priorityCoverage even when everything else is correct", async () => {
    const input = greatListing({ title: "A".repeat(80) + " bamboo cutting board" });
    const preview = await simulator.run(input);
    const criticalFinding = preview.gradedFindings.find((f) => f.ruleId === "title_length_limit");
    expect(criticalFinding).toBeDefined();
    expect(criticalFinding!.expectedAction).toBe("fixNow");
    expect(criticalFinding!.acceptedActions).not.toContain("skip");

    const userFindingActions = Object.fromEntries(
      preview.gradedFindings.map((f) => [
        f.id,
        f.id === criticalFinding!.id ? ("skip" as const) : f.expectedAction,
      ]),
    );
    const result = await simulator.run({ ...input, userFindingActions });
    expect(result.scoreDimensions!.priorityCoverage).toBeLessThan(100);
    expect(result.scoreDimensions!.direction).toBeLessThan(100);
  });

  it("this scenario's findings span more than one valid expectedAction", async () => {
    const result = await simulator.run(gtInput);
    const actionTypes = new Set(result.gradedFindings.map((f) => f.expectedAction));
    expect(actionTypes.size).toBeGreaterThan(1);
  });

  it("severity changes alone do not silently rewrite the resolved action", () => {
    // Same ruleId, same context, different severity -- resolution must be
    // identical because it's the override on niche_in_title's context (a
    // primary keyword covers the title), not the finding's severity, that
    // decides this. Proves the resolver isn't secretly still
    // `severity === "info" ? "skip" : "fix"`.
    const ctx: RuleContext = {
      title: "Reliable Widget For Home Use",
      lowerTitle: "reliable widget for home use",
      bullets: [],
      lowerBullets: [],
      description: "",
      lowerDescription: "",
      niche: "widget",
      nicheWords: ["widget"],
      categoryVariant: {
        id: "general_home",
        label: "General Hardlines & Home",
        prohibitedClaimTerms: [],
        requiredAttributeTerms: [],
      },
      marketplace: "US",
      images: [],
      hasVideo: false,
      hasAPlus: false,
      structuredAttributes: {},
      primaryCustomerIntent: "shoppers looking for a reliable widget",
      primaryKeywords: ["reliable widget"],
      complianceEvidence: {},
    };
    const makeFinding = (severity: AuditFinding["severity"]): AuditFinding => ({
      id: `f-${severity}`,
      ruleId: "niche_in_title",
      dimension: "relevance",
      severity,
      isCriticalGate: false,
      message: "Niche keyword not found in title.",
      suggestion: "Add the niche term to the title.",
      category: "general_home",
      marketplace: "US",
      policyVersion: "test-policy",
      effectiveDate: "2026-01-01",
    });

    const warningResult = resolveExpectedAction(makeFinding("warning"), ctx);
    const infoResult = resolveExpectedAction(makeFinding("info"), ctx);
    const criticalResult = resolveExpectedAction(makeFinding("critical"), ctx);

    expect(warningResult.expectedAction).toBe("skip");
    expect(infoResult.expectedAction).toBe("skip");
    expect(criticalResult.expectedAction).toBe("skip");
  });
});

// ── STORY-083 concrete skip cases ────────────────────────────────────────────
// docs/stories/STORY-083.md's six documented skip cases, each verified
// end-to-end through simulator.run() so the wiring from ListingAuditInput's
// context fields through to the resolved expectedAction is proven, not
// just the resolver function in isolation.

describe("STORY-083 concrete skip cases", () => {
  it("relevance: a primary keyword synonym in the title disproves a missing-niche-word finding", async () => {
    const result = await simulator.run(
      greatListing({
        title: "Eco Kitchen Prep Surface for Everyday Cooking",
        niche: "bamboo cutting board",
        primaryKeywords: ["eco kitchen prep"],
        primaryCustomerIntent: "shoppers looking for an eco-friendly kitchen prep surface",
      }),
    );
    const finding = result.gradedFindings.find((f) => f.ruleId === "niche_in_title");
    expect(finding).toBeDefined();
    expect(finding!.expectedAction).toBe("skip");
  });

  it("compliance: documented evidence disproves a superlative-claim false positive", async () => {
    const result = await simulator.run(
      greatListing({
        bullets: [...greatListing().bullets, "Backed by our 100% satisfaction guarantee program"],
        complianceEvidence: {
          prohibited_superlative_claims:
            "This is our registered guarantee program name, not an unverifiable claim.",
        },
      }),
    );
    const finding = result.gradedFindings.find((f) => f.ruleId === "prohibited_superlative_claims");
    expect(finding).toBeDefined();
    expect(finding!.expectedAction).toBe("skip");
  });

  it("mobile: the first-screen title portion identifies the product per documented customer intent", async () => {
    const result = await simulator.run(
      greatListing({
        title: "Eco-Friendly Sustainable Kitchen Prep Surface Made From Bamboo",
        primaryCustomerIntent: "eco-friendly sustainable kitchen prep surface",
      }),
    );
    const finding = result.gradedFindings.find((f) => f.ruleId === "title_front_loaded");
    expect(finding).toBeDefined();
    expect(finding!.expectedAction).toBe("skip");
  });

  it("apparel: structured data (size chart) covers a required attribute missing from visible copy", async () => {
    const result = await simulator.run(
      greatListing({
        category: "Apparel",
        bullets: ["Comfortable everyday wear", "Great for any occasion"],
        description: "A great addition to your wardrobe that looks good every time you wear it.",
        structuredAttributes: {
          sizeChart: "S/M/L/XL available, see size guide",
          materialComposition: "100% cotton",
        },
      }),
    );
    const finding = result.gradedFindings.find((f) => f.ruleId === "category_required_attributes");
    expect(finding).toBeDefined();
    expect(finding!.expectedAction).toBe("skip");
  });

  it("electronics: structured data (compatibility table) covers a required attribute missing from visible copy", async () => {
    const result = await simulator.run(
      greatListing({
        category: "Electronics",
        bullets: ["Sleek design", "Long-lasting battery"],
        description: "A great addition to your desk setup.",
        structuredAttributes: {
          compatibleDevices: "Works with iPhone 12+, USB-C required",
          requiresPower: "Requires 5V/2A power adapter",
        },
      }),
    );
    const finding = result.gradedFindings.find((f) => f.ruleId === "category_required_attributes");
    expect(finding).toBeDefined();
    expect(finding!.expectedAction).toBe("skip");
  });

  it("imagery: fewer than 5 images is not a real gap when every required role is already present", async () => {
    const result = await simulator.run(
      greatListing({
        images: [
          {
            slot: 1,
            role: "main",
            whiteBackground: true,
            hasTextOverlay: false,
            productFillPct: 85,
          },
          {
            slot: 2,
            role: "lifestyle",
            whiteBackground: false,
            hasTextOverlay: false,
            productFillPct: 60,
          },
          {
            slot: 3,
            role: "infographic",
            whiteBackground: false,
            hasTextOverlay: true,
            productFillPct: 40,
          },
        ],
      }),
    );
    const finding = result.gradedFindings.find((f) => f.ruleId === "image_count_sufficient");
    expect(finding).toBeDefined();
    expect(finding!.expectedAction).toBe("skip");
  });
});

// ── STORY-083 critical-gate escalate exception ───────────────────────────────

describe("STORY-083 critical-gate escalate exception", () => {
  it("a critical finding with no documented evidence must be fixed now, never skipped", async () => {
    const result = await simulator.run(
      greatListing({
        bullets: [...greatListing().bullets, "This natural finish cures in 48 hours"],
      }),
    );
    const finding = result.gradedFindings.find((f) => f.ruleId === "prohibited_medical_claims");
    expect(finding).toBeDefined();
    expect(finding!.expectedAction).toBe("fixNow");
    expect(finding!.acceptedActions).toEqual(["fixNow"]);
  });

  it("disproven evidence on a critical-gate finding resolves to skip", async () => {
    const result = await simulator.run(
      greatListing({
        bullets: [...greatListing().bullets, "This natural finish cures in 48 hours"],
        complianceEvidence: {
          prohibited_medical_claims:
            "disproven: 'cures' describes the wood-finish curing process, not a medical claim.",
        },
      }),
    );
    const finding = result.gradedFindings.find((f) => f.ruleId === "prohibited_medical_claims");
    expect(finding).toBeDefined();
    expect(finding!.expectedAction).toBe("skip");
  });

  it("ambiguous (not disproven) evidence on a critical-gate finding resolves to escalate, never skip", async () => {
    const result = await simulator.run(
      greatListing({
        bullets: [...greatListing().bullets, "This natural finish cures in 48 hours"],
        complianceEvidence: {
          prohibited_medical_claims:
            "Legal is reviewing whether 'cures' in this context could be read as a health claim.",
        },
      }),
    );
    const finding = result.gradedFindings.find((f) => f.ruleId === "prohibited_medical_claims");
    expect(finding).toBeDefined();
    expect(finding!.expectedAction).toBe("escalate");
    expect(finding!.acceptedActions).not.toContain("skip");
  });
});

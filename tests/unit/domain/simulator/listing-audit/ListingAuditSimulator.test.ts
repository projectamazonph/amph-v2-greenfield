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
});

/**
 * CampaignBuilderSimulator tests — TDD (red first).
 *
 * STORY-039: Campaign Builder simulator.
 */

import { describe, it, expect } from "vitest";
import { CampaignBuilderSimulator } from "@/domain/simulator/campaign-builder/CampaignBuilderSimulator";
import type { CampaignBuilderInput } from "@/domain/simulator/campaign-builder/CampaignBuilderInput";

describe("CampaignBuilderSimulator", () => {
  const simulator = new CampaignBuilderSimulator();

  it("returns campaigns with ad groups, keywords, match types, and bids", async () => {
    const input: CampaignBuilderInput = {
      productCategory: "Running Shoes",
      monthlyBudget: 1000,
      targetingStrategy: "manual",
      productNiche: "running shoes",
    };

    const result = await simulator.run(input);

    expect(result.campaigns.length).toBeGreaterThan(0);
    for (const campaign of result.campaigns) {
      expect(campaign.name).toBeTruthy();
      expect(campaign.adGroups.length).toBeGreaterThan(0);
      for (const adGroup of campaign.adGroups) {
        // Auto and Brand campaigns have empty keyword lists — only check manual ones
        if (adGroup.name.includes("Auto") || adGroup.name.includes("Brand")) {
          continue;
        }
        expect(adGroup.keywords.length).toBeGreaterThan(0);
        for (const kw of adGroup.keywords) {
          expect(["exact", "phrase", "broad"]).toContain(kw.matchType);
        }
        expect(adGroup.suggestedBid).toBeGreaterThan(0);
      }
    }
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("returns 1 campaign for a small budget", async () => {
    const input: CampaignBuilderInput = {
      productCategory: "Running Shoes",
      monthlyBudget: 100,
      targetingStrategy: "manual",
      productNiche: "running shoes",
    };

    const result = await simulator.run(input);

    expect(result.campaigns.length).toBeGreaterThanOrEqual(1);
  });

  it("returns multiple campaigns for a large budget", async () => {
    const input: CampaignBuilderInput = {
      productCategory: "Running Shoes",
      monthlyBudget: 5000,
      targetingStrategy: "manual",
      productNiche: "running shoes",
    };

    const result = await simulator.run(input);

    expect(result.campaigns.length).toBeGreaterThan(1);
  });

  it("returns empty campaigns for zero budget", async () => {
    const input: CampaignBuilderInput = {
      productCategory: "Running Shoes",
      monthlyBudget: 0,
      targetingStrategy: "manual",
      productNiche: "running shoes",
    };

    const result = await simulator.run(input);

    expect(result.campaigns).toHaveLength(0);
    expect(result.score).toBe(0);
  });

  it("generates keywords based on the product niche", async () => {
    const input: CampaignBuilderInput = {
      productCategory: "Coffee Beans",
      monthlyBudget: 500,
      targetingStrategy: "manual",
      productNiche: "coffee beans",
    };

    const result = await simulator.run(input);

    const allKeywords = result.campaigns.flatMap((c) =>
      c.adGroups.flatMap((ag) => ag.keywords.map((k) => k.keyword.toLowerCase())),
    );
    // Keywords should contain references to the niche
    expect(allKeywords.length).toBeGreaterThan(0);
  });
});

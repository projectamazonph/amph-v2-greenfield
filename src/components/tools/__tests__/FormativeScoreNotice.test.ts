/**
 * FormativeScoreNotice.test.ts — STORY-078.
 *
 * AGENTS.md's simulator guardrail: "Simulator scores are formative.
 * Never label them 'certified' or 'hiring ready' in copy." Pins that
 * every one of the 5 simulator result views actually renders the
 * shared notice, so a future edit that drops the import from one
 * simulator (but not the others) fails CI instead of only being
 * caught by manually clicking through all 5 tools.
 */

import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";

const RESULT_FILES = [
  "src/components/tools/BidElevatorResult.tsx",
  "src/components/tools/ListingAuditForm.tsx",
  "src/components/tools/CampaignBuilderForm.tsx",
  "src/components/tools/StrTriageForm.tsx",
  "src/components/tools/KeywordResearchForm.tsx",
];

describe("FormativeScoreNotice is wired into every simulator result view", () => {
  for (const relPath of RESULT_FILES) {
    it(`${relPath} imports and renders <FormativeScoreNotice />`, async () => {
      const source = await readFile(path.join(process.cwd(), relPath), "utf8");
      expect(source).toMatch(
        /import\s+\{\s*FormativeScoreNotice\s*\}\s+from\s+"\.\/FormativeScoreNotice"/,
      );
      expect(source).toMatch(/<FormativeScoreNotice\s*\/>/);
    });
  }
});

describe("FormativeScoreNotice copy", () => {
  it("never claims certification or hiring readiness in the rendered text", async () => {
    const source = await readFile(
      path.join(process.cwd(), "src/components/tools/FormativeScoreNotice.tsx"),
      "utf8",
    );
    const renderedText = source.match(/<p[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? "";
    expect(renderedText.length).toBeGreaterThan(0);
    expect(renderedText.toLowerCase()).not.toMatch(/\bis certified\b/);
    expect(renderedText.toLowerCase()).not.toMatch(/hiring ready/);
    expect(renderedText).toMatch(/not a certification|practice|hiring signal/i);
  });
});

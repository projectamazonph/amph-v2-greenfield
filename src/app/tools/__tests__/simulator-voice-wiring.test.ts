import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";

const PAGE_FILES = [
  "src/app/tools/bid-elevator/page.tsx",
  "src/app/tools/str-triage/page.tsx",
  "src/app/tools/campaign-builder/page.tsx",
  "src/app/tools/listing-audit/page.tsx",
  "src/app/tools/keyword-research/page.tsx",
] as const;

const FORM_FILES = [
  "src/components/tools/BidElevatorResult.tsx",
  "src/components/tools/StrTriageForm.tsx",
  "src/components/tools/CampaignBuilderForm.tsx",
  "src/components/tools/ListingAuditForm.tsx",
  "src/components/tools/KeywordResearchForm.tsx",
] as const;

describe("simulator voice wiring", () => {
  it("uses the shared header and coach guide on every simulator page", async () => {
    for (const relPath of PAGE_FILES) {
      const source = await readFile(path.join(process.cwd(), relPath), "utf8");

      expect(source).toContain("SimulatorPageHeader");
      expect(source).toContain("SimulatorCoachGuide");
    }
  });

  it("gives every simulator result a next-rep coaching cue", async () => {
    for (const relPath of FORM_FILES) {
      const source = await readFile(path.join(process.cwd(), relPath), "utf8");

      expect(source).toContain("SimulatorNextRep");
    }
  });
});

import { describe, expect, it } from "vitest";
import { loadCapstoneManifest } from "@/lib/capstone";

describe("loadCapstoneManifest", () => {
  it("loads the published brief with six deliverables and six criteria", () => {
    const manifest = loadCapstoneManifest();
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.deliverables).toHaveLength(6);
    expect(manifest.rubric.criteria).toHaveLength(6);
    expect(manifest.rubric.passThreshold).toBe(9);
    const kinds = manifest.deliverables.map((d) => d.artefactKind).sort();
    expect(kinds).toEqual([
      "campaign-map",
      "decision-log",
      "keyword-plan",
      "listing-audit",
      "triage-report",
      "weekly-readout",
    ]);
  });
});

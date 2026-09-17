import { describe, expect, it } from "vitest";
import {
  checkCapstoneReadiness,
  loadCapstoneManifest,
  parseCapstoneManifest,
} from "@/lib/capstone";

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

describe("checkCapstoneReadiness", () => {
  const manifest = loadCapstoneManifest();

  it("returns ready when all six kinds are submitted", () => {
    const readiness = checkCapstoneReadiness(manifest, [
      "listing-audit",
      "keyword-plan",
      "campaign-map",
      "decision-log",
      "triage-report",
      "weekly-readout",
    ]);
    expect(readiness.ready).toBe(true);
    expect(readiness.missingKinds).toEqual([]);
  });

  it("names the missing kinds on a partial set", () => {
    const readiness = checkCapstoneReadiness(manifest, ["listing-audit", "keyword-plan"]);
    expect(readiness.ready).toBe(false);
    expect(readiness.missingKinds).toEqual([
      "campaign-map",
      "decision-log",
      "triage-report",
      "weekly-readout",
    ]);
  });

  it("returns not-ready on an empty input", () => {
    const readiness = checkCapstoneReadiness(manifest, []);
    expect(readiness.ready).toBe(false);
    expect(readiness.missingKinds).toHaveLength(6);
  });

  it("ignores duplicates and unknown kinds", () => {
    const readiness = checkCapstoneReadiness(manifest, [
      "listing-audit",
      "listing-audit",
      "mystery-kind",
      "keyword-plan",
      "campaign-map",
      "decision-log",
      "triage-report",
      "weekly-readout",
    ]);
    expect(readiness.ready).toBe(true);
    expect(readiness.missingKinds).toEqual([]);
  });
});

describe("parseCapstoneManifest", () => {
  it("rejects a non-object", () => {
    expect(parseCapstoneManifest(null)).toEqual({
      kind: "manifest_invalid",
      message: "Manifest must be an object.",
    });
  });

  it("rejects a missing rubric", () => {
    expect(
      parseCapstoneManifest({
        schemaVersion: 1,
        title: "t",
        intro: "i",
        deliverables: [{ id: "a", label: "A", artefactKind: "decision-log" }],
      }),
    ).toEqual({
      kind: "manifest_invalid",
      message: "Manifest rubric must be an object.",
    });
  });
});

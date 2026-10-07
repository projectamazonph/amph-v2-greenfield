import { describe, expect, it } from "vitest";
import {
  checkCapstoneReadiness,
  checkKindReadiness,
  parseCapstoneManifest,
} from "@/domain/services/Capstone";

describe("checkKindReadiness", () => {
  const required = [
    "listing-audit",
    "keyword-plan",
    "campaign-map",
    "decision-log",
    "triage-report",
    "weekly-readout",
  ];

  it("returns ready when every required kind is present", () => {
    const readiness = checkKindReadiness(required, [...required]);
    expect(readiness.ready).toBe(true);
    expect(readiness.missingKinds).toEqual([]);
  });

  it("filters blank required kinds", () => {
    const readiness = checkKindReadiness(["listing-audit", "  "], ["listing-audit"]);
    expect(readiness.ready).toBe(true);
    expect(readiness.requiredKinds).toEqual(["listing-audit"]);
  });
});

describe("checkCapstoneReadiness", () => {
  const manifest = {
    schemaVersion: 1 as const,
    title: "Capstone",
    intro: "Intro.",
    deliverables: [
      { id: "a", label: "A", artefactKind: "listing-audit", summary: "S." },
      { id: "b", label: "B", artefactKind: "keyword-plan", summary: "S." },
      { id: "c", label: "C", artefactKind: "campaign-map", summary: "S." },
      { id: "d", label: "D", artefactKind: "decision-log", summary: "S." },
      { id: "e", label: "E", artefactKind: "triage-report", summary: "S." },
      { id: "f", label: "F", artefactKind: "weekly-readout", summary: "S." },
    ],
    rubric: {
      pointsPerCriterion: 2,
      passThreshold: 9,
      criteria: [
        {
          id: "a",
          label: "A",
          artefactKind: "listing-audit",
          goodLooksLike: "Good.",
        },
      ],
    },
  };

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

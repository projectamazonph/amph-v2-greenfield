import { describe, expect, it } from "vitest";
import { loadDiagnosticManifest, scoreDiagnostic } from "@/lib/diagnostic";

describe("loadDiagnosticManifest", () => {
  it("loads the published diagnostic question set", () => {
    const manifest = loadDiagnosticManifest();
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.questions).toHaveLength(3);
    expect(manifest.rubric.outcomes.map((o) => o.id)).toEqual(["new", "familiar", "experienced"]);
    expect(manifest.rubric.fallbackOutcome).toBe("familiar");
  });
});

describe("scoreDiagnostic", () => {
  const manifest = loadDiagnosticManifest();

  it("returns the new outcome when every answer signals a beginner", () => {
    const outcome = scoreDiagnostic(manifest, {
      "have-managed-ads": "no",
      "read-reports": "not-yet",
      "explain-bid": "lower-bid",
    });
    expect(outcome.id).toBe("new");
    expect(outcome.label).toBe("New to Amazon PPC");
  });

  it("returns the experienced outcome when every answer signals an experienced operator", () => {
    const outcome = scoreDiagnostic(manifest, {
      "have-managed-ads": "ran-many",
      "read-reports": "train-others",
      "explain-bid": "compare-benchmarks",
    });
    expect(outcome.id).toBe("experienced");
    expect(outcome.label).toBe("Experienced operator");
  });

  it("returns the familiar outcome for a mixed set of answers", () => {
    const outcome = scoreDiagnostic(manifest, {
      "have-managed-ads": "ran-small",
      "read-reports": "used-reports",
      "explain-bid": "read-data",
    });
    expect(outcome.id).toBe("familiar");
  });

  it("falls back when not every question is answered", () => {
    const outcome = scoreDiagnostic(manifest, {
      "have-managed-ads": "ran-many",
    });
    expect(outcome.id).toBe(manifest.rubric.fallbackOutcome);
  });

  it("falls back when the answer set matches no outcome exactly", () => {
    const outcome = scoreDiagnostic(manifest, {
      "have-managed-ads": "ran-small",
      "read-reports": "used-reports",
      "explain-bid": "lower-bid",
    });
    expect(outcome.id).toBe(manifest.rubric.fallbackOutcome);
  });
});

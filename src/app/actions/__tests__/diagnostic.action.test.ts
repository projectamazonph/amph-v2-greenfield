import { describe, expect, it, vi, beforeEach } from "vitest";
import { loadDiagnosticManifest, scoreDiagnostic } from "@/lib/diagnostic";

const mockRequireAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  requireAuth: () => mockRequireAuth(),
}));

const mockRecordDiagnosticResult = vi.fn();
vi.mock("@/composition/container", () => ({
  buildContainer: () => ({
    recordDiagnosticResult: { execute: mockRecordDiagnosticResult },
  }),
}));

const mockRedirect = vi.fn((url: string) => {
  throw Object.assign(new Error(`NEXT_REDIRECT: ${url}`), { digest: `NEXT_REDIRECT: ${url}` });
});
vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
}));

import { submitDiagnosticAction } from "../diagnostic.action";

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

describe("submitDiagnosticAction", () => {
  beforeEach(() => {
    mockRequireAuth.mockReset();
    mockRecordDiagnosticResult.mockReset();
    mockRedirect.mockClear();

    mockRequireAuth.mockResolvedValue({ id: "user_action_01", email: "action@example.com" });
    mockRecordDiagnosticResult.mockResolvedValue({
      ok: true,
      value: { outcome: "experienced", completedAt: new Date() },
    });
  });

  it("persists the result via RecordDiagnosticResult and redirects to /dashboard/diagnostic?outcome=...", async () => {
    const formData = new FormData();
    formData.set("have-managed-ads", "ran-many");
    formData.set("read-reports", "train-others");
    formData.set("explain-bid", "compare-benchmarks");

    await expect(submitDiagnosticAction(null, formData)).rejects.toThrow(
      "NEXT_REDIRECT: /dashboard/diagnostic?outcome=experienced",
    );

    expect(mockRecordDiagnosticResult).toHaveBeenCalledWith({
      userId: "user_action_01",
      outcome: "experienced",
    });
  });

  it("returns an error if any question is missing", async () => {
    const formData = new FormData();
    formData.set("have-managed-ads", "ran-many");

    const result = await submitDiagnosticAction(null, formData);
    expect(result).toEqual({
      kind: "error",
      error:
        "Please answer: How comfortable are you reading ACoS, CPC, CTR, and conversion-rate reports?",
    });
    expect(mockRecordDiagnosticResult).not.toHaveBeenCalled();
  });

  it("returns an error if an invalid option value is submitted", async () => {
    const formData = new FormData();
    formData.set("have-managed-ads", "invalid_value");
    formData.set("read-reports", "train-others");
    formData.set("explain-bid", "compare-benchmarks");

    const result = await submitDiagnosticAction(null, formData);
    expect(result).toEqual({
      kind: "error",
      error:
        "Please pick one of the options for: Have you ever managed a Sponsored Products, Sponsored Brands, or Sponsored Display campaign?",
    });
    expect(mockRecordDiagnosticResult).not.toHaveBeenCalled();
  });
});

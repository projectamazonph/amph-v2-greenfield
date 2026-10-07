import { describe, expect, it } from "vitest";
import { loadFirstDecisionBrief, parseFirstDecisionBrief } from "@/lib/firstDecision";

describe("loadFirstDecisionBrief", () => {
  it("loads the published first-decision brief", () => {
    const brief = loadFirstDecisionBrief();
    expect(brief.schemaVersion).toBe(1);
    expect(brief.title.length).toBeGreaterThan(0);
    expect(brief.scenarioContext.length).toBeGreaterThan(0);
    expect(brief.decisionRule.length).toBeGreaterThan(0);
    expect(brief.resultExplanation.length).toBeGreaterThan(0);
  });
});

describe("parseFirstDecisionBrief", () => {
  it("rejects a non-object", () => {
    expect(parseFirstDecisionBrief(null)).toEqual({
      kind: "brief_invalid",
      message: "Brief must be an object.",
    });
  });

  it("rejects a missing schemaVersion", () => {
    expect(
      parseFirstDecisionBrief({
        title: "t",
        intro: "i",
        scenarioContext: "s",
        decisionRule: "r",
        resultExplanation: "x",
      }),
    ).toEqual({
      kind: "brief_invalid",
      message: "Brief schemaVersion must be 1.",
    });
  });

  it("rejects a missing required field", () => {
    expect(
      parseFirstDecisionBrief({
        schemaVersion: 1,
        title: "t",
        intro: "i",
        scenarioContext: "s",
        decisionRule: "r",
      }),
    ).toEqual({
      kind: "brief_invalid",
      message: "Brief resultExplanation must be a non-empty string.",
    });
  });
});

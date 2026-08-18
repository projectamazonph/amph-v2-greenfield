import { describe, expect, it } from "vitest";
import { SIMULATOR_COPY } from "../simulatorCopy";

const SIMULATOR_IDS = [
  "bid-elevator",
  "str-triage",
  "campaign-builder",
  "listing-audit",
  "keyword-research",
] as const;

describe("simulator copy contract", () => {
  it("defines the same coaching frame for every simulator", () => {
    for (const simulatorId of SIMULATOR_IDS) {
      const copy = SIMULATOR_COPY[simulatorId];

      expect(copy.label).not.toBe("");
      expect(copy.outcome).not.toBe("");
      expect(copy.task).not.toBe("");
      expect(copy.coachNote).not.toBe("");
      expect(copy.nextRep).not.toBe("");
    }
  });

  it("keeps coaching copy short enough for a first read", () => {
    for (const copy of Object.values(SIMULATOR_COPY)) {
      expect(copy.outcome.split(/\s+/).length).toBeLessThanOrEqual(18);
      expect(copy.task.split(/\s+/).length).toBeLessThanOrEqual(18);
    }
  });
});

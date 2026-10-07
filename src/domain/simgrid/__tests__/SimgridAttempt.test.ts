import { describe, expect, it } from "vitest";

import { SIMGRID_SIMULATOR_IDS, isSimgridSimulatorId } from "@/domain/simgrid";

describe("SimgridSimulatorId", () => {
  it("SIMGRID_SIMULATOR_IDS lists the 12 simulator ids in alphabetical order", () => {
    expect(SIMGRID_SIMULATOR_IDS).toEqual([
      "account-audit",
      "ad-console",
      "bid-decisions",
      "bulk-file",
      "campaign-architect",
      "capstone-sequence",
      "client-onboarding",
      "keyword-lab",
      "listing",
      "pacing-deck",
      "search-triage",
      "sqp-studio",
    ]);
  });

  it("isSimgridSimulatorId accepts each known id and rejects unknown values", () => {
    for (const id of SIMGRID_SIMULATOR_IDS) {
      expect(isSimgridSimulatorId(id)).toBe(true);
    }
    expect(isSimgridSimulatorId("not-a-simulator")).toBe(false);
    expect(isSimgridSimulatorId("")).toBe(false);
    expect(isSimgridSimulatorId(null)).toBe(false);
    expect(isSimgridSimulatorId(undefined)).toBe(false);
    expect(isSimgridSimulatorId(42)).toBe(false);
    expect(isSimgridSimulatorId({ simulator: "ad-console" })).toBe(false);
  });
});

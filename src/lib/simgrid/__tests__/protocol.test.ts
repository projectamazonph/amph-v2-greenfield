import { describe, expect, it } from "vitest";

import {
  SIMGRID_BRIDGE_KIND_ATTEMPT,
  SIMGRID_BRIDGE_SOURCE,
  SIMGRID_BRIDGE_TOKEN,
  isSimgridBridgeMessage,
} from "@/lib/simgrid/protocol";

function buildValidMessage(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    source: SIMGRID_BRIDGE_SOURCE,
    kind: SIMGRID_BRIDGE_KIND_ATTEMPT,
    token: SIMGRID_BRIDGE_TOKEN,
    attempt: {
      simulatorId: "ad-console",
      scenarioVersion: "v1",
      rubricVersion: "v1",
      score: 80,
      passed: true,
      completedAt: "2026-09-30T12:00:00.000Z",
      scenarioId: "scenario-1",
      policyVersion: "p1",
    },
    ...overrides,
  };
}

describe("isSimgridBridgeMessage", () => {
  it("accepts a well-formed bridge message", () => {
    const value = buildValidMessage();
    expect(isSimgridBridgeMessage(value)).toBe(true);
  });

  it("rejects the wrong source or kind", () => {
    expect(isSimgridBridgeMessage(buildValidMessage({ source: "other-bridge" }))).toBe(false);
    expect(isSimgridBridgeMessage(buildValidMessage({ kind: "other_kind" }))).toBe(false);
    expect(isSimgridBridgeMessage(null)).toBe(false);
    expect(isSimgridBridgeMessage(undefined)).toBe(false);
    expect(isSimgridBridgeMessage("string")).toBe(false);
    expect(isSimgridBridgeMessage(42)).toBe(false);
  });

  it("rejects bad attempt payloads (missing attempt, score range, passed type, completedAt format, simulatorId)", () => {
    expect(isSimgridBridgeMessage(buildValidMessage({ attempt: undefined }))).toBe(false);
    expect(
      isSimgridBridgeMessage(
        buildValidMessage({
          attempt: {
            simulatorId: "ad-console",
            scenarioVersion: "v1",
            rubricVersion: "v1",
            score: -1,
            passed: true,
            completedAt: "2026-09-30T12:00:00.000Z",
          },
        }),
      ),
    ).toBe(false);
    expect(
      isSimgridBridgeMessage(
        buildValidMessage({
          attempt: {
            simulatorId: "ad-console",
            scenarioVersion: "v1",
            rubricVersion: "v1",
            score: 101,
            passed: true,
            completedAt: "2026-09-30T12:00:00.000Z",
          },
        }),
      ),
    ).toBe(false);
    expect(
      isSimgridBridgeMessage(
        buildValidMessage({
          attempt: {
            simulatorId: "ad-console",
            scenarioVersion: "v1",
            rubricVersion: "v1",
            score: 80,
            passed: "yes",
            completedAt: "2026-09-30T12:00:00.000Z",
          },
        }),
      ),
    ).toBe(false);
    expect(
      isSimgridBridgeMessage(
        buildValidMessage({
          attempt: {
            simulatorId: "ad-console",
            scenarioVersion: "v1",
            rubricVersion: "v1",
            score: 80,
            passed: true,
            completedAt: "yesterday",
          },
        }),
      ),
    ).toBe(false);
    expect(
      isSimgridBridgeMessage(
        buildValidMessage({
          attempt: {
            simulatorId: "made-up-sim",
            scenarioVersion: "v1",
            rubricVersion: "v1",
            score: 80,
            passed: true,
            completedAt: "2026-09-30T12:00:00.000Z",
          },
        }),
      ),
    ).toBe(false);
  });

  it("rejects missing or non-string token", () => {
    expect(isSimgridBridgeMessage(buildValidMessage({ token: undefined }))).toBe(false);
    expect(isSimgridBridgeMessage(buildValidMessage({ token: 42 }))).toBe(false);
    expect(isSimgridBridgeMessage(buildValidMessage({ token: null }))).toBe(false);
    expect(isSimgridBridgeMessage(buildValidMessage({ token: { value: "amph-bridge" } }))).toBe(
      false,
    );
    expect(isSimgridBridgeMessage(buildValidMessage({ token: ["amph-bridge"] }))).toBe(false);
  });
});

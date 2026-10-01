// src/components/simgrid/__tests__/SimgridFrame.test.tsx
// @vitest-environment jsdom
/**
 * SimgridFrame.test.tsx — Task 8 of the 2026-09-30 SimGrid
 * integration plan.
 *
 * Locks the postMessage listener contract for the iframe host
 * component. The listener must reject every malformed message before
 * the server action fires:
 *   1. Wrong origin → ignored.
 *   2. Wrong source (not the `simhub-static-bridge` sentinel) → ignored.
 *   3. Wrong simulatorId (mismatch with the prop) → ignored.
 *   4. Valid message → recordSimgridProgressAction is called with the
 *      attempt payload.
 *
 * Only the happy path is verified end-to-end (token + source + kind +
 * simulatorId all pass); the protocol-level validation (token,
 * kind, attempt shape) is exercised by
 * src/lib/simgrid/__tests__/protocol.test.ts and is intentionally
 * not duplicated here.
 *
 * Each test starts with a fresh render, so `cleanup()` between tests
 * is required (the listener attaches to `window` and would otherwise
 * leak across cases).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, render } from "@testing-library/react";

vi.mock("@/app/actions/simgridProgress.action", () => ({
  recordSimgridProgressAction: vi
    .fn()
    .mockResolvedValue({ ok: true, value: { id: "x", recordedAt: "x" } }),
}));

import { recordSimgridProgressAction } from "@/app/actions/simgridProgress.action";
import { SimgridFrame } from "@/components/simgrid/SimgridFrame";

beforeEach(() => {
  (recordSimgridProgressAction as unknown as ReturnType<typeof vi.fn>).mockClear();
});

afterEach(() => {
  cleanup();
});

function fireMessage(data: unknown, origin: string = window.location.origin): void {
  const event = new MessageEvent("message", { origin, data });
  act(() => {
    window.dispatchEvent(event);
  });
}

function validAttempt(
  overrides: Partial<{
    simulatorId: string;
    scenarioVersion: string;
    rubricVersion: string;
    score: number;
    passed: boolean;
    completedAt: string;
  }> = {},
) {
  return {
    simulatorId: "bid-decisions",
    scenarioVersion: "1",
    rubricVersion: "1",
    score: 80,
    passed: true,
    completedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("SimgridFrame postMessage listener", () => {
  it("ignores messages with the wrong origin", () => {
    render(
      <SimgridFrame
        simulatorId="bid-decisions"
        src="/simgrid-v1/bid-decisions.html?x=1"
        title="x"
      />,
    );
    fireMessage(
      {
        source: "simhub-static-bridge",
        kind: "simulator_attempt",
        token: "amph-bridge",
        attempt: validAttempt(),
      },
      "https://evil.example",
    );
    expect(recordSimgridProgressAction).not.toHaveBeenCalled();
  });

  it("ignores messages with the wrong source", () => {
    render(
      <SimgridFrame
        simulatorId="bid-decisions"
        src="/simgrid-v1/bid-decisions.html?x=1"
        title="x"
      />,
    );
    fireMessage({
      source: "evil",
      kind: "simulator_attempt",
      token: "amph-bridge",
      attempt: validAttempt(),
    });
    expect(recordSimgridProgressAction).not.toHaveBeenCalled();
  });

  it("ignores messages for a different simulator id", () => {
    render(
      <SimgridFrame
        simulatorId="bid-decisions"
        src="/simgrid-v1/bid-decisions.html?x=1"
        title="x"
      />,
    );
    fireMessage({
      source: "simhub-static-bridge",
      kind: "simulator_attempt",
      token: "amph-bridge",
      attempt: validAttempt({ simulatorId: "ad-console" }),
    });
    expect(recordSimgridProgressAction).not.toHaveBeenCalled();
  });

  it("calls the server action on a valid message", () => {
    render(
      <SimgridFrame
        simulatorId="bid-decisions"
        src="/simgrid-v1/bid-decisions.html?x=1"
        title="x"
      />,
    );
    fireMessage({
      source: "simhub-static-bridge",
      kind: "simulator_attempt",
      token: "amph-bridge",
      attempt: validAttempt(),
    });
    expect(recordSimgridProgressAction).toHaveBeenCalledWith({
      attempt: expect.objectContaining({
        simulatorId: "bid-decisions",
        score: 80,
      }),
    });
  });
});

/**
 * SimulatorDecision entity tests.
 *
 * STORY-064: Simulator Attempt Infrastructure.
 */

import { describe, it, expect } from "vitest";
import {
  createSimulatorDecision,
  type SimulatorDecision,
} from "@/domain/entities/SimulatorDecision";

describe("SimulatorDecision", () => {
  // ── createSimulatorDecision: basic creation ──────────────────

  it("creates a decision with correct fields", () => {
    const decision = createSimulatorDecision({
      id: "dec_01",
      attemptId: "att_01",
      revision: 1,
      decisionData: { action: "increase_bid", bid: 1.5 },
    });

    expect(decision.ok).toBe(true);
    if (!decision.ok) return;
    const d = decision.value;
    expect(d.id).toBe("dec_01");
    expect(d.attemptId).toBe("att_01");
    expect(d.revision).toBe(1);
    expect(d.decisionData).toEqual({ action: "increase_bid", bid: 1.5 });
    expect(d.submittedAt).toBeInstanceOf(Date);
  });

  it("defaults revision to 1 when not provided", () => {
    const decision = createSimulatorDecision({
      id: "dec_02",
      attemptId: "att_01",
      decisionData: { action: "decrease_bid" },
    });

    expect(decision.ok).toBe(true);
    if (!decision.ok) return;
    expect(decision.value.revision).toBe(1);
  });

  it("defaults submittedAt to the current time", () => {
    const before = new Date();
    const decision = createSimulatorDecision({
      id: "dec_03",
      attemptId: "att_01",
      decisionData: { action: "hold" },
    });
    const after = new Date();

    expect(decision.ok).toBe(true);
    if (!decision.ok) return;
    const d = decision.value;
    expect(d.submittedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(d.submittedAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it("accepts a custom submittedAt date", () => {
    const fixedDate = new Date("2026-07-01T10:00:00Z");
    const decision = createSimulatorDecision({
      id: "dec_04",
      attemptId: "att_01",
      decisionData: { action: "pause" },
      submittedAt: fixedDate,
    });

    expect(decision.ok).toBe(true);
    if (!decision.ok) return;
    expect(decision.value.submittedAt).toEqual(fixedDate);
  });

  it("accepts empty decisionData", () => {
    const decision = createSimulatorDecision({
      id: "dec_05",
      attemptId: "att_01",
      decisionData: {},
    });

    expect(decision.ok).toBe(true);
    if (!decision.ok) return;
    expect(decision.value.decisionData).toEqual({});
  });

  it("revision auto-increments for multiple decisions", () => {
    const d1 = createSimulatorDecision({
      id: "dec_r1",
      attemptId: "att_r",
      decisionData: { step: 1 },
    });
    const d2 = createSimulatorDecision({
      id: "dec_r2",
      attemptId: "att_r",
      decisionData: { step: 2 },
      revision: 2,
    });
    const d3 = createSimulatorDecision({
      id: "dec_r3",
      attemptId: "att_r",
      decisionData: { step: 3 },
      revision: 3,
    });

    expect(d1.ok && d2.ok && d3.ok).toBe(true);
    if (!d1.ok || !d2.ok || !d3.ok) return;
    expect(d1.value.revision).toBe(1);
    expect(d2.value.revision).toBe(2);
    expect(d3.value.revision).toBe(3);
  });
});

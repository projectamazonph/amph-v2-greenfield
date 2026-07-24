/**
 * SimulatorAttempt entity tests.
 *
 * STORY-064: Simulator Attempt Infrastructure.
 */

import { describe, it, expect } from "vitest";
import {
  createSimulatorAttempt,
  addDecision,
  submitAttempt,
  gradeAttempt,
  expireAttempt,
  hydrateSimulatorAttempt,
} from "@/domain/entities/SimulatorAttempt";
import { createSimulatorDecision } from "@/domain/entities/SimulatorDecision";

// Helper: unwrap a Result that should never fail (e.g. createSimulatorDecision)
function expectOk<T>(result: { ok: true; value: T } | { ok: false }): T {
  if (!result.ok) throw new Error("expected ok, got err");
  return result.value;
}

// Helper: unwrap addDecision / submitAttempt / gradeAttempt / expireAttempt
function unwrapResult<T>(
  result: { ok: true; value: T } | { ok: false } | { ok: false; error: null },
): T {
  if (!result.ok) throw new Error("expected ok, got: " + JSON.stringify(result));
  return (result as { ok: true; value: T }).value;
}

describe("SimulatorAttempt", () => {
  // ── createSimulatorAttempt: basic creation ──────────────────

  it("creates with correct fields and status=in_progress", () => {
    const a = createSimulatorAttempt({
      id: "id_01",
      attemptId: "ATT-ABC1234",
      userId: "user_01",
      simulatorId: "bid-elevator",
      scenarioId: "scen_01",
      scenarioVersion: 1,
      difficulty: "beginner",
      mode: "practice",
    });

    expect(a.status).toBe("in_progress");
    expect(a.id).toBe("id_01");
    expect(a.attemptId).toBe("ATT-ABC1234");
    expect(a.userId).toBe("user_01");
    expect(a.simulatorId).toBe("bid-elevator");
    expect(a.scenarioId).toBe("scen_01");
    expect(a.scenarioVersion).toBe(1);
    expect(a.difficulty).toBe("beginner");
    expect(a.mode).toBe("practice");
    expect(a.seed).not.toBeNull();
    expect(a.score).toBeNull();
    expect(a.scoreDimensions).toBeNull();
    expect(a.startedAt).toBeInstanceOf(Date);
    expect(a.submittedAt).toBeNull();
    expect(a.gradedAt).toBeNull();
    expect(a.decisions).toEqual([]);
  });

  it("generates attemptId starting with ATT-", () => {
    const attempt = createSimulatorAttempt({
      id: "id_02",
      attemptId: "ATT-X1Y2Z3",
      userId: "user_02",
      simulatorId: "str-triage",
      scenarioId: "scen_02",
      scenarioVersion: 1,
      difficulty: "intermediate",
      mode: "challenge",
    });

    expect(attempt.attemptId).toMatch(/^ATT-/);
  });

  it("defaults mode to practice", () => {
    const attempt = createSimulatorAttempt({
      id: "id_03",
      attemptId: "ATT-DEF456",
      userId: "user_03",
      simulatorId: "campaign-builder",
      scenarioId: "scen_03",
      scenarioVersion: 1,
      difficulty: "advanced",
    });

    expect(attempt.mode).toBe("practice");
  });

  // ── addDecision ─────────────────────────────────────────────

  it("addDecision appends decision with revision=1 for first decision", () => {
    const attempt = createSimulatorAttempt({
      id: "id_04",
      attemptId: "ATT-111",
      userId: "user_04",
      simulatorId: "bid-elevator",
      scenarioId: "scen_04",
      scenarioVersion: 1,
      difficulty: "beginner",
    });

    const decision = expectOk(
      createSimulatorDecision({
        id: "dec_01",
        attemptId: "id_04",
        decisionData: { bid: 1.5 },
      }),
    );

    const result = addDecision(attempt, decision);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.decisions).toHaveLength(1);
    expect(result.value.decisions[0]!.revision).toBe(1);
  });

  it("addDecision increments revision correctly for multiple decisions", () => {
    const attempt = createSimulatorAttempt({
      id: "id_05",
      attemptId: "ATT-222",
      userId: "user_05",
      simulatorId: "str-triage",
      scenarioId: "scen_05",
      scenarioVersion: 1,
      difficulty: "intermediate",
    });

    const d1 = expectOk(
      createSimulatorDecision({ id: "d1", attemptId: attempt.id, decisionData: { step: 1 } }),
    );
    const d2 = expectOk(
      createSimulatorDecision({
        id: "d2",
        attemptId: attempt.id,
        decisionData: { step: 2 },
        revision: 2,
      }),
    );
    const d3 = expectOk(
      createSimulatorDecision({
        id: "d3",
        attemptId: attempt.id,
        decisionData: { step: 3 },
        revision: 3,
      }),
    );

    const r1 = unwrapResult(addDecision(attempt, d1));
    const r2 = unwrapResult(addDecision(r1, d2));
    const r3 = unwrapResult(addDecision(r2, d3));

    expect(r1.decisions).toHaveLength(1);
    expect(r1.decisions[0]!.revision).toBe(1);
    expect(r2.decisions).toHaveLength(2);
    expect(r2.decisions[0]!.revision).toBe(1);
    expect(r2.decisions[1]!.revision).toBe(2);
    expect(r3.decisions).toHaveLength(3);
    expect(r3.decisions[2]!.revision).toBe(3);
  });

  // ── submitAttempt ────────────────────────────────────────────

  it("submitAttempt transitions in_progress to submitted and sets submittedAt", () => {
    const attempt = createSimulatorAttempt({
      id: "id_06",
      attemptId: "ATT-333",
      userId: "user_06",
      simulatorId: "listing-audit",
      scenarioId: "scen_06",
      scenarioVersion: 1,
      difficulty: "advanced",
    });

    const result = submitAttempt(attempt);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe("submitted");
    expect(result.value.submittedAt).not.toBeNull();
    expect(result.value.submittedAt).toBeInstanceOf(Date);
  });

  it("submitAttempt returns error for already-submitted attempt", () => {
    const attempt = createSimulatorAttempt({
      id: "id_07",
      attemptId: "ATT-444",
      userId: "user_07",
      simulatorId: "campaign-builder",
      scenarioId: "scen_07",
      scenarioVersion: 1,
      difficulty: "beginner",
    });

    const submitted = unwrapResult(submitAttempt(attempt));
    expect(submitted.status).toBe("submitted");

    const result = submitAttempt(submitted);
    expect(result.ok).toBe(false);
  });

  it("submitAttempt returns error for graded attempt", () => {
    const attempt = createSimulatorAttempt({
      id: "id_08",
      attemptId: "ATT-555",
      userId: "user_08",
      simulatorId: "bid-elevator",
      scenarioId: "scen_08",
      scenarioVersion: 1,
      difficulty: "intermediate",
    });

    const submitted = unwrapResult(submitAttempt(attempt));
    const graded = gradeAttempt(submitted, 85, { direction: 90, magnitude: 80 });
    expect(graded.ok).toBe(true);
    if (!graded.ok) return;

    const result = submitAttempt(graded.value);
    expect(result.ok).toBe(false);
  });

  // ── gradeAttempt ─────────────────────────────────────────────

  it("gradeAttempt transitions submitted to graded with score and dimensions", () => {
    const attempt = createSimulatorAttempt({
      id: "id_09",
      attemptId: "ATT-666",
      userId: "user_09",
      simulatorId: "str-triage",
      scenarioId: "scen_09",
      scenarioVersion: 1,
      difficulty: "advanced",
    });

    const submitted = unwrapResult(submitAttempt(attempt));
    const result = gradeAttempt(submitted, 92, {
      direction: 95,
      magnitude: 88,
      profitability: 93,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe("graded");
    expect(result.value.score).toBe(92);
    expect(result.value.scoreDimensions).toEqual({
      direction: 95,
      magnitude: 88,
      profitability: 93,
    });
    expect(result.value.gradedAt).not.toBeNull();
    expect(result.value.gradedAt).toBeInstanceOf(Date);
  });

  it("gradeAttempt returns error for in_progress attempt", () => {
    const attempt = createSimulatorAttempt({
      id: "id_10",
      attemptId: "ATT-777",
      userId: "user_10",
      simulatorId: "listing-audit",
      scenarioId: "scen_10",
      scenarioVersion: 1,
      difficulty: "beginner",
    });

    const result = gradeAttempt(attempt, 75, { explanation: 75 });
    expect(result.ok).toBe(false);
  });

  it("gradeAttempt returns error for already-graded attempt", () => {
    const attempt = createSimulatorAttempt({
      id: "id_11",
      attemptId: "ATT-888",
      userId: "user_11",
      simulatorId: "campaign-builder",
      scenarioId: "scen_11",
      scenarioVersion: 1,
      difficulty: "intermediate",
    });

    const submitted = unwrapResult(submitAttempt(attempt));
    const graded = gradeAttempt(submitted, 70, { direction: 70 });
    expect(graded.ok).toBe(true);
    if (!graded.ok) return;

    const result = gradeAttempt(graded.value, 80, { direction: 80 });
    expect(result.ok).toBe(false);
  });

  // ── expireAttempt ─────────────────────────────────────────────

  it("expireAttempt transitions in_progress to expired", () => {
    const attempt = createSimulatorAttempt({
      id: "id_12",
      attemptId: "ATT-999",
      userId: "user_12",
      simulatorId: "bid-elevator",
      scenarioId: "scen_12",
      scenarioVersion: 1,
      difficulty: "beginner",
    });

    const result = expireAttempt(attempt);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe("expired");
  });

  it("expireAttempt returns error for submitted attempt", () => {
    const attempt = createSimulatorAttempt({
      id: "id_13",
      attemptId: "ATT-AAA",
      userId: "user_13",
      simulatorId: "str-triage",
      scenarioId: "scen_13",
      scenarioVersion: 1,
      difficulty: "intermediate",
    });

    const submitted = unwrapResult(submitAttempt(attempt));
    const result = expireAttempt(submitted);
    expect(result.ok).toBe(false);
  });

  // ── hydrate ──────────────────────────────────────────────────

  it("hydrate reconstructs from plain object", () => {
    const plain = {
      id: "hyd_01",
      attemptId: "ATT-HYD01",
      userId: "user_hyd",
      simulatorId: "bid-elevator" as const,
      scenarioId: "scen_hyd",
      scenarioVersion: 2,
      difficulty: "advanced" as const,
      mode: "credential" as const,
      status: "submitted" as const,
      seed: "seed_abc123",
      score: null as number | null,
      scoreDimensions: null,
      startedAt: new Date("2026-07-01T09:00:00Z"),
      submittedAt: new Date("2026-07-01T09:30:00Z"),
      gradedAt: null,
      decisions: [] as readonly {
        id: string;
        attemptId: string;
        revision: number;
        decisionData: Record<string, unknown>;
        submittedAt: Date;
      }[],
    };

    const a = hydrateSimulatorAttempt(plain);
    expect(a.id).toBe("hyd_01");
    expect(a.attemptId).toBe("ATT-HYD01");
    expect(a.status).toBe("submitted");
    expect(a.seed).toBe("seed_abc123");
    expect(a.startedAt).toEqual(new Date("2026-07-01T09:00:00Z"));
    expect(a.submittedAt).toEqual(new Date("2026-07-01T09:30:00Z"));
    expect(a.gradedAt).toBeNull();
  });

  it("hydrate preserves decisions when reconstructing", () => {
    const decisions = [
      {
        id: "d_h1",
        attemptId: "hyd_02",
        revision: 1,
        decisionData: { action: "raise" },
        submittedAt: new Date("2026-07-01T09:10:00Z"),
      },
      {
        id: "d_h2",
        attemptId: "hyd_02",
        revision: 2,
        decisionData: { action: "hold" },
        submittedAt: new Date("2026-07-01T09:20:00Z"),
      },
    ];

    const plain = {
      id: "hyd_02",
      attemptId: "ATT-HYD02",
      userId: "user_hyd2",
      simulatorId: "str-triage" as const,
      scenarioId: "scen_hyd2",
      scenarioVersion: 1,
      difficulty: "intermediate" as const,
      mode: "practice" as const,
      status: "in_progress" as const,
      seed: null,
      score: null,
      scoreDimensions: null,
      startedAt: new Date("2026-07-01T09:00:00Z"),
      submittedAt: null,
      gradedAt: null,
      decisions,
    };

    const result = hydrateSimulatorAttempt(plain);
    expect(result.decisions).toHaveLength(2);
    expect(result.decisions[0]!.decisionData).toEqual({ action: "raise" });
    expect(result.decisions[1]!.decisionData).toEqual({ action: "hold" });
  });
});

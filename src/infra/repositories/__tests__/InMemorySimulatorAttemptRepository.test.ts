/**
 * InMemorySimulatorAttemptRepository tests.
 *
 * STORY-064: Simulator Attempt Infrastructure.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { Result } from "@/domain/shared/Result";
import { InMemorySimulatorAttemptRepository } from "@/infra/repositories/InMemorySimulatorAttemptRepository";
import { createSimulatorAttempt } from "@/domain/entities/SimulatorAttempt";
import { createSimulatorDecision } from "@/domain/entities/SimulatorDecision";
import type { SimulatorAttempt } from "@/domain/entities/SimulatorAttempt";
import type { SimulatorDecision } from "@/domain/entities/SimulatorDecision";
import type { SimulatorAttemptError } from "@/ports/repositories/ISimulatorAttemptRepository";

/** Unwrap a Result whose error type is SimulatorAttemptError. */
function unwrap<T>(result: Result<T, SimulatorAttemptError>): T {
  if (!result.ok) throw new Error("Unexpected error: " + JSON.stringify(result.error));
  if (result.value === null) throw new Error("Unexpected null value");
  return result.value as T & object;
}

function makeAttempt(
  overrides: Partial<{
    id: string;
    attemptId: string;
    userId: string;
    simulatorId: string;
    scenarioId: string;
    status: string;
    decisions: readonly SimulatorDecision[];
  }> = {},
): SimulatorAttempt {
  const id = overrides.id ?? "att_01";
  const base = createSimulatorAttempt({
    id,
    attemptId: overrides.attemptId ?? `ATT-${id}`,
    userId: overrides.userId ?? "user_01",
    simulatorId: (overrides.simulatorId ?? "bid-elevator") as SimulatorAttempt["simulatorId"],
    scenarioId: overrides.scenarioId ?? "scen_01",
    scenarioVersion: 1,
    difficulty: "beginner",
    mode: "practice",
  });
  if (overrides.status && overrides.status !== "in_progress") {
    // Allow test to override status (used for seeding submitted/graded attempts)
    return { ...base, status: overrides.status as SimulatorAttempt["status"] } as SimulatorAttempt;
  }
  return base;
}

function makeDecision(
  attemptId: string,
  decisionData: Record<string, unknown> = {},
  revision?: number,
): SimulatorDecision {
  const result = createSimulatorDecision({
    id: `dec_${Date.now()}_${Math.random()}`,
    attemptId,
    decisionData,
    revision,
  });
  if (!result.ok) throw new Error("impossible: createSimulatorDecision always succeeds");
  return result.value;
}

describe("InMemorySimulatorAttemptRepository", () => {
  let repo: InMemorySimulatorAttemptRepository;

  beforeEach(() => {
    repo = new InMemorySimulatorAttemptRepository();
  });

  // ── create + findById round-trip ─────────────────────────────

  it("create -> findById returns it", async () => {
    const attempt = makeAttempt({ id: "att_c1", attemptId: "ATT-C1" });
    const createResult = await repo.create(attempt);
    expect(createResult.ok).toBe(true);
    if (!createResult.ok) return;

    const found = await repo.findById("att_c1");
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    if (!found.value) throw new Error("expected attempt");
    expect(found.value.id).toBe("att_c1");
    expect(found.value.attemptId).toBe("ATT-C1");
    expect(found.value.status).toBe("in_progress");
  });

  it("findById returns null for unknown id", async () => {
    const result = await repo.findById("ghost");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBeNull();
  });

  // ── findByAttemptId ─────────────────────────────────────────

  it("findByAttemptId returns the attempt", async () => {
    const attempt = makeAttempt({ id: "att_a1", attemptId: "ATT-A1B2C3" });
    await repo.create(attempt);

    const found = await repo.findByAttemptId("ATT-A1B2C3");
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    expect(found.value?.id).toBe("att_a1");
  });

  it("findByAttemptId returns null for unknown attemptId", async () => {
    const result = await repo.findByAttemptId("ATT-GHOST");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBeNull();
  });

  // ── findByUserAndScenario ────────────────────────────────────

  it("findByUserAndScenario returns matching attempts", async () => {
    const a1 = makeAttempt({
      id: "att_u1",
      userId: "alice",
      simulatorId: "bid-elevator",
      scenarioId: "s1",
    });
    const a2 = makeAttempt({
      id: "att_u2",
      userId: "alice",
      simulatorId: "bid-elevator",
      scenarioId: "s1",
    });
    const a3 = makeAttempt({
      id: "att_u3",
      userId: "bob",
      simulatorId: "bid-elevator",
      scenarioId: "s1",
    });
    await repo.create(a1);
    await repo.create(a2);
    await repo.create(a3);

    const result = await repo.findByUserAndScenario("alice", "bid-elevator", "s1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(2);
    expect(result.value.map((a) => a.id).sort()).toEqual(["att_u1", "att_u2"]);
  });

  it("findByUserAndScenario with onlyInProgress=true filters by status", async () => {
    const a1 = makeAttempt({
      id: "att_p1",
      userId: "carol",
      simulatorId: "str-triage",
      scenarioId: "s2",
      status: "in_progress",
    });
    await repo.create(a1);

    // Manually set one to submitted
    await repo.updateStatus("att_p1", "submitted");

    const a2 = makeAttempt({
      id: "att_p2",
      userId: "carol",
      simulatorId: "str-triage",
      scenarioId: "s2",
      status: "in_progress",
    });
    await repo.create(a2);

    const result = await repo.findByUserAndScenario("carol", "str-triage", "s2", {
      onlyInProgress: true,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(1);
    expect(result.value[0]!.id).toBe("att_p2");
  });

  it("findByUserAndScenario returns empty array when no matches", async () => {
    const result = await repo.findByUserAndScenario("nobody", "bid-elevator", "ghost_scenario");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual([]);
  });

  // ── addDecision ──────────────────────────────────────────────

  it("addDecision -> decision appears on attempt", async () => {
    const attempt = makeAttempt({ id: "att_d1", attemptId: "ATT-D1" });
    await repo.create(attempt);

    const decision = makeDecision("att_d1", { action: "raise_bid", bid: 2.0 });
    const addResult = await repo.addDecision("att_d1", decision);
    expect(addResult.ok).toBe(true);

    const found = await repo.findById("att_d1");
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    const foundAttempt = unwrap(found)!;
    expect(foundAttempt.decisions).toHaveLength(1);
    expect(foundAttempt.decisions[0]!.decisionData).toEqual({ action: "raise_bid", bid: 2.0 });
    expect(foundAttempt.decisions[0]!.revision).toBe(1);
  });

  it("addDecision returns error for non-existent attempt", async () => {
    const decision = makeDecision("ghost_att", { action: "test" });
    const result = await repo.addDecision("ghost_att", decision);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("not_found");
  });

  it("addDecision returns already_submitted when attempt is submitted", async () => {
    const attempt = makeAttempt({ id: "att_ds1", status: "submitted" });
    await repo.create(attempt);

    const decision = makeDecision("att_ds1", { action: "too_late" });
    const result = await repo.addDecision("att_ds1", decision);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("already_submitted");
  });

  it("addDecision returns already_graded when attempt is graded", async () => {
    const attempt = makeAttempt({ id: "att_dg1", status: "graded" });
    await repo.create(attempt);

    const decision = makeDecision("att_dg1", { action: "after_graded" });
    const result = await repo.addDecision("att_dg1", decision);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("already_graded");
  });

  // ── updateStatus ─────────────────────────────────────────────

  it("updateStatus transitions to submitted and sets submittedAt", async () => {
    const attempt = makeAttempt({ id: "att_us1" });
    await repo.create(attempt);

    const result = await repo.updateStatus("att_us1", "submitted");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe("submitted");
    expect(result.value.submittedAt).not.toBeNull();
  });

  it("updateStatus sets score and dimensions on grade", async () => {
    const attempt = makeAttempt({ id: "att_us2" });
    await repo.create(attempt);
    await repo.updateStatus("att_us2", "submitted");

    const result = await repo.updateStatus("att_us2", "graded", {
      score: 87,
      scoreDimensions: { direction: 90, magnitude: 84 },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe("graded");
    expect(result.value.score).toBe(87);
    expect(result.value.scoreDimensions).toEqual({ direction: 90, magnitude: 84 });
    expect(result.value.gradedAt).not.toBeNull();
  });

  it("updateStatus returns not_found for unknown id", async () => {
    const result = await repo.updateStatus("ghost", "submitted");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("not_found");
  });

  it("updateStatus returns invalid_status_transition for graded->submitted", async () => {
    const attempt = makeAttempt({ id: "att_inv1" });
    await repo.create(attempt);
    await repo.updateStatus("att_inv1", "submitted");
    await repo.updateStatus("att_inv1", "graded", { score: 80, scoreDimensions: {} });

    const result = await repo.updateStatus("att_inv1", "submitted");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("invalid_status_transition");
  });

  // ── seed + clear helpers ─────────────────────────────────────

  it("seed() populates the store with pre-existing attempts", async () => {
    const attempt = makeAttempt({ id: "att_seed1" });
    repo.seed([attempt]);

    const found = await repo.findById("att_seed1");
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    expect(unwrap(found)!.id).toBe("att_seed1");
  });

  it("clear() empties the store", async () => {
    const attempt = makeAttempt({ id: "att_clear1" });
    await repo.create(attempt);
    repo.clear();

    const found = await repo.findById("att_clear1");
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    const val: SimulatorAttempt | null = found.value;
    expect(val).toBeNull();
  });

  // ── Multiple decisions with revisions ─────────────────────────

  it("multiple addDecision calls maintain correct revision numbers", async () => {
    const attempt = makeAttempt({ id: "att_multi1", attemptId: "ATT-MULTI1" });
    await repo.create(attempt);

    // Manually set revisions — InMemorySimulatorAttemptRepository.addDecision
    // appends the decision as-is without computing revision
    const d1 = makeDecision("att_multi1", { step: 1 }, 1);
    const d2 = makeDecision("att_multi1", { step: 2 }, 2);
    const d3 = makeDecision("att_multi1", { step: 3 }, 3);

    await repo.addDecision("att_multi1", d1);
    await repo.addDecision("att_multi1", d2);
    await repo.addDecision("att_multi1", d3);

    const found = await repo.findById("att_multi1");
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    const foundAttempt = unwrap(found)!;
    expect(foundAttempt.decisions).toHaveLength(3);
    expect(foundAttempt.decisions[0]!.revision).toBe(1);
    expect(foundAttempt.decisions[1]!.revision).toBe(2);
    expect(foundAttempt.decisions[2]!.revision).toBe(3);
  });
});

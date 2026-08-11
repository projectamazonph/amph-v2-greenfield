/**
 * StartSimulatorAttempt ΓÇö opens an in_progress attempt for a student.
 * STORY-064.
 *
 * Convention: hand-wire fakes per file (matches AdminArchiveBadge.test.ts).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { StartSimulatorAttempt } from "../StartSimulatorAttempt";
import { InMemorySimulatorAttemptRepository } from "@/infra/repositories/InMemorySimulatorAttemptRepository";
import { InMemorySimulatorScenarioRepository } from "@/infra/simulator/InMemorySimulatorScenarioRepository";
import { createSimulatorScenario } from "@/domain/entities/SimulatorScenario";
import { createSimulatorAttempt } from "@/domain/entities/SimulatorAttempt";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { FixedClock } from "@/ports/system/Clock";
import type { AuditAction } from "@/domain/values/AuditAction";
import { InMemoryScorePolicyRepository } from "@/infra/repositories/InMemoryScorePolicyRepository";
import { createScorePolicy } from "@/domain/entities/ScorePolicy";

function makeScenarioRepo() {
  const repo = new InMemorySimulatorScenarioRepository();
  const r = createSimulatorScenario({
    id: "scn_1",
    simulatorId: "bid-elevator",
    name: "Beginner Bids",
    description: "d",
    inputSchema: {},
    outputSchema: {},
    difficulty: "beginner",
    estimatedMinutes: 5,
  });
  if (!r.ok) throw new Error("seed failed");
  repo.seed(r.value);
  return repo;
}

function makeIdGen() {
  let n = 0;
  return { newId: () => `${(++n).toString(16).toUpperCase().padStart(8, "0")}` };
}

function makeAuditShim(audit: InMemoryAuditLog) {
  return {
    execute: async (entry: {
      actorId: string;
      action: AuditAction;
      targetType: string;
      targetId: string;
      metadata?: Record<string, unknown>;
    }) => {
      audit.record({
        id: `audit_${entry.targetId}`,
        actorId: entry.actorId,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        metadata: entry.metadata ?? {},
        occurredAt: new Date(),
      });
      return { recorded: true };
    },
  };
}

describe("StartSimulatorAttempt", () => {
  let attemptRepo: InMemorySimulatorAttemptRepository;
  let scenarioRepo: InMemorySimulatorScenarioRepository;
  let audit: InMemoryAuditLog;
  let idGen: ReturnType<typeof makeIdGen>;
  let clock: FixedClock;
  let scorePolicyRepo: InMemoryScorePolicyRepository;
  let useCase: StartSimulatorAttempt;

  beforeEach(() => {
    attemptRepo = new InMemorySimulatorAttemptRepository();
    scenarioRepo = makeScenarioRepo();
    audit = new InMemoryAuditLog();
    idGen = makeIdGen();
    clock = new FixedClock(new Date("2025-01-01T00:00:00Z"));
    scorePolicyRepo = new InMemoryScorePolicyRepository();
    useCase = new StartSimulatorAttempt({
      attemptRepo,
      scorePolicyRepo,
      scenarioRepo,
      idGen,
      clock,
      recordAuditLog: makeAuditShim(audit),
    });
  });

  it("returns a fresh in_progress attempt for a known scenario", async () => {
    const r = await useCase.execute({
      userId: "u_1",
      simulatorId: "bid-elevator",
      scenarioId: "scn_1",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.status).toBe("in_progress");
    expect(r.value.userId).toBe("u_1");
    expect(r.value.simulatorId).toBe("bid-elevator");
    expect(r.value.scenarioId).toBe("scn_1");
    expect(r.value.difficulty).toBe("beginner"); // copied from scenario
    expect(r.value.mode).toBe("practice"); // default
    expect(r.value.score).toBeNull();
    expect(r.value.scoreDimensions).toBeNull();
    expect(r.value.decisions).toEqual([]);
    expect(r.value.attemptId).toMatch(/^ATT-[A-Z0-9]{1,8}$/);
    // Clock is honored: startedAt is the injected FixedClock value, not a fresh Date.now().
    expect(r.value.startedAt).toEqual(new Date("2025-01-01T00:00:00Z"));
    expect(r.value.submittedAt).toBeNull();
    expect(r.value.gradedAt).toBeNull();
  });

  it("returns scenario_not_found when the scenario is missing", async () => {
    const emptyScenarioRepo = new InMemorySimulatorScenarioRepository();
    const uc = new StartSimulatorAttempt({
      attemptRepo,
      scorePolicyRepo,
      scenarioRepo: emptyScenarioRepo,
      idGen,
      clock,
      recordAuditLog: makeAuditShim(audit),
    });
    const r = await uc.execute({
      userId: "u_1",
      simulatorId: "bid-elevator",
      scenarioId: "scn_missing",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("scenario_not_found");
  });

  it("returns already_in_progress when an active attempt exists", async () => {
    // Seed an in_progress attempt for the same user+simulator+scenario
    const existing = createSimulatorAttempt({
      id: "id_existing",
      attemptId: "ATT-EXISTING",
      userId: "u_1",
      simulatorId: "bid-elevator",
      scenarioId: "scn_1",
      seed: "SEED0000",
      startedAt: new Date("2024-12-31T00:00:00Z"),
    });
    attemptRepo.create(existing);

    const r = await useCase.execute({
      userId: "u_1",
      simulatorId: "bid-elevator",
      scenarioId: "scn_1",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("already_in_progress");
  });

  it("respects a guided mode override", async () => {
    const r = await useCase.execute({
      userId: "u_1",
      simulatorId: "bid-elevator",
      scenarioId: "scn_1",
      mode: "guided",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.mode).toBe("guided");
  });

  it("rejects challenge mode until the student passes practice", async () => {
    const r = await useCase.execute({
      userId: "u_1",
      simulatorId: "bid-elevator",
      scenarioId: "scn_1",
      mode: "challenge",
    });

    expect(r).toEqual({ ok: false, error: { kind: "challenge_locked" } });
  });

  it("allows challenge mode after the student passes practice", async () => {
    const policy = createScorePolicy({
      id: "policy-1",
      simulatorId: "bid-elevator",
      difficulty: "beginner",
      mode: "practice",
      dimensionConfig: { direction: { weight: 1 } },
      passingScore: 70,
    });
    if (!policy.ok) throw new Error("policy seed failed");
    await scorePolicyRepo.create(policy.value);
    const practiceAttempt = createSimulatorAttempt({
      id: "practice-pass",
      attemptId: "ATT-PRACTICE",
      userId: "u_1",
      simulatorId: "bid-elevator",
      scenarioId: "older-scenario",
      difficulty: "beginner",
      mode: "practice",
      startedAt: new Date("2024-12-31T00:00:00Z"),
    });
    attemptRepo.seed([{ ...practiceAttempt, status: "graded", score: 85 }]);

    const r = await useCase.execute({
      userId: "u_1",
      simulatorId: "bid-elevator",
      scenarioId: "scn_1",
      mode: "challenge",
    });

    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.mode).toBe("challenge");
  });

  it("writes a simulator_attempt_start audit entry", async () => {
    await useCase.execute({
      userId: "u_1",
      simulatorId: "bid-elevator",
      scenarioId: "scn_1",
    });
    const logs = await audit.list({ limit: 100 });
    expect(logs.ok).toBe(true);
    if (!logs.ok) return;
    expect(logs.value.entries.some((e) => e.action === "simulator_attempt.started")).toBe(true);
  });

  it("does not write audit when scenario is missing", async () => {
    const emptyScenarioRepo = new InMemorySimulatorScenarioRepository();
    const uc = new StartSimulatorAttempt({
      attemptRepo,
      scorePolicyRepo,
      scenarioRepo: emptyScenarioRepo,
      idGen,
      clock,
      recordAuditLog: makeAuditShim(audit),
    });
    await uc.execute({
      userId: "u_1",
      simulatorId: "bid-elevator",
      scenarioId: "scn_missing",
    });
    const logs = await audit.list({ limit: 100 });
    expect(logs.ok).toBe(true);
    if (!logs.ok) return;
    expect(logs.value.entries.some((e) => e.action === "simulator_attempt.started")).toBe(false);
  });
});

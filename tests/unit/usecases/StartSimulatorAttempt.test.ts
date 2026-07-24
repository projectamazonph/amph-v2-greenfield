/**
 * StartSimulatorAttempt use case tests.
 *
 * STORY-064: Simulator Attempt Infrastructure.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { Result } from "@/domain/shared/Result";
import { StartSimulatorAttempt } from "@/usecases/StartSimulatorAttempt";
import type { ISimulatorAttemptRepository } from "@/ports/repositories/ISimulatorAttemptRepository";
import type { ISimulatorScenarioRepository } from "@/ports/repositories/ISimulatorScenarioRepository";
import type { SimulatorScenario } from "@/domain/entities/SimulatorScenario";

function makeScenario(
  overrides: Partial<{
    id: string;
    simulatorId: string;
    name: string;
    difficulty: string;
  }> = {},
): SimulatorScenario {
  return {
    id: overrides.id ?? "scen_01",
    simulatorId: (overrides.simulatorId ?? "bid-elevator") as SimulatorScenario["simulatorId"],
    name: overrides.name ?? "Test Scenario",
    description: "A test scenario",
    inputSchema: {},
    outputSchema: {},
    difficulty: (overrides.difficulty ?? "beginner") as SimulatorScenario["difficulty"],
    estimatedMinutes: 10,
  };
}

function makeAttemptRepo(): ISimulatorAttemptRepository {
  return {
    create: vi.fn().mockResolvedValue(Result.ok({} as never)),
    findById: vi.fn().mockResolvedValue(Result.ok(null)),
    findByAttemptId: vi.fn().mockResolvedValue(Result.ok(null)),
    findByUserAndScenario: vi.fn().mockResolvedValue(Result.ok([])),
    addDecision: vi.fn().mockResolvedValue(Result.ok(undefined)),
    updateStatus: vi.fn().mockResolvedValue(Result.ok({} as never)),
  };
}

function makeScenarioRepo(): ISimulatorScenarioRepository {
  return {
    listAll: vi.fn().mockResolvedValue(Result.ok([])),
    findById: vi.fn(),
    create: vi.fn().mockResolvedValue(Result.ok(makeScenario())),
    update: vi.fn().mockResolvedValue(Result.ok(makeScenario())),
    archive: vi.fn().mockResolvedValue(Result.ok(undefined)),
  };
}

function makeIdGen(): { newId: () => string } {
  let counter = 0;
  return {
    newId: () => `id_${++counter}`,
  };
}

function makeClock(): { now: () => Date } {
  const now = new Date("2026-07-24T10:00:00Z");
  return {
    now: () => now,
  };
}

function makeRecordAuditLog(): {
  execute: (entry: {
    actorId: string;
    action: string;
    targetType: string;
    targetId: string;
    metadata?: Record<string, unknown>;
  }) => Promise<{ recorded: boolean }>;
} {
  return {
    execute: vi.fn().mockResolvedValue({ recorded: true }),
  };
}

describe("StartSimulatorAttempt", () => {
  let attemptRepo: ISimulatorAttemptRepository;
  let scenarioRepo: ISimulatorScenarioRepository;
  let idGen: { newId: () => string };
  let clock: { now: () => Date };
  let recordAuditLog: {
    execute: (entry: {
      actorId: string;
      action: string;
      targetType: string;
      targetId: string;
      metadata?: Record<string, unknown>;
    }) => Promise<{ recorded: boolean }>;
  };

  beforeEach(() => {
    attemptRepo = makeAttemptRepo();
    scenarioRepo = makeScenarioRepo();
    idGen = makeIdGen();
    clock = makeClock();
    recordAuditLog = makeRecordAuditLog();
  });

  // ── Happy path ───────────────────────────────────────────────

  it("scenario exists + no active attempt -> creates attempt, returns it", async () => {
    const scenario = makeScenario({ id: "scen_happy", simulatorId: "bid-elevator" });
    vi.mocked(scenarioRepo.findById).mockResolvedValue(Result.ok(scenario));
    vi.mocked(attemptRepo.findByUserAndScenario).mockResolvedValue(Result.ok([]));

    const uc = new StartSimulatorAttempt({
      attemptRepo,
      scenarioRepo,
      idGen,
      clock,
      recordAuditLog,
    });

    const result = await uc.execute({
      userId: "user_01",
      simulatorId: "bid-elevator",
      scenarioId: "scen_happy",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const attempt = result.value;
    expect(attempt.userId).toBe("user_01");
    expect(attempt.simulatorId).toBe("bid-elevator");
    expect(attempt.scenarioId).toBe("scen_happy");
    expect(attempt.status).toBe("in_progress");
    expect(attempt.attemptId).toMatch(/^ATT-/);
    expect(attempt.seed).not.toBeNull();
  });

  it("logs to audit log on success", async () => {
    const scenario = makeScenario({ id: "scen_audit" });
    vi.mocked(scenarioRepo.findById).mockResolvedValue(Result.ok(scenario));

    const uc = new StartSimulatorAttempt({
      attemptRepo,
      scenarioRepo,
      idGen,
      clock,
      recordAuditLog,
    });

    await uc.execute({
      userId: "user_audit",
      simulatorId: "str-triage",
      scenarioId: "scen_audit",
    });

    expect(recordAuditLog.execute).toHaveBeenCalledOnce();
    const logEntry = (recordAuditLog.execute as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(logEntry).toMatchObject({
      actorId: "user_audit",
      action: "simulator_attempt_start",
      targetType: "SimulatorAttempt",
    });
  });

  // ── Error cases ──────────────────────────────────────────────

  it("scenario not found -> returns scenario_not_found", async () => {
    vi.mocked(scenarioRepo.findById).mockResolvedValue(Result.ok(null));

    const uc = new StartSimulatorAttempt({
      attemptRepo,
      scenarioRepo,
      idGen,
      clock,
      recordAuditLog,
    });

    const result = await uc.execute({
      userId: "user_ghost",
      simulatorId: "bid-elevator",
      scenarioId: "ghost_scenario",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("scenario_not_found");
  });

  it("existing in_progress attempt -> returns already_in_progress", async () => {
    const scenario = makeScenario({ id: "scen_active" });
    vi.mocked(scenarioRepo.findById).mockResolvedValue(Result.ok(scenario));
    vi.mocked(attemptRepo.findByUserAndScenario).mockResolvedValue(
      Result.ok([
        {
          id: "existing_attempt",
          attemptId: "ATT-EXISTING",
          userId: "user_active",
          simulatorId: "bid-elevator" as const,
          scenarioId: "scen_active",
          scenarioVersion: 1,
          difficulty: "beginner" as const,
          mode: "practice" as const,
          status: "in_progress" as const,
          seed: "SEED123",
          score: null,
          scoreDimensions: null,
          startedAt: new Date(),
          submittedAt: null,
          gradedAt: null,
          decisions: [],
        },
      ]),
    );

    const uc = new StartSimulatorAttempt({
      attemptRepo,
      scenarioRepo,
      idGen,
      clock,
      recordAuditLog,
    });

    const result = await uc.execute({
      userId: "user_active",
      simulatorId: "bid-elevator",
      scenarioId: "scen_active",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("already_in_progress");
  });

  it("generates attemptId with ATT- prefix", async () => {
    const scenario = makeScenario({ id: "scen_attid" });
    vi.mocked(scenarioRepo.findById).mockResolvedValue(Result.ok(scenario));

    const uc = new StartSimulatorAttempt({
      attemptRepo,
      scenarioRepo,
      idGen,
      clock,
      recordAuditLog,
    });

    const result = await uc.execute({
      userId: "user_attid",
      simulatorId: "campaign-builder",
      scenarioId: "scen_attid",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.attemptId).toMatch(/^ATT-/);
  });

  it("defaults mode to practice", async () => {
    const scenario = makeScenario({ id: "scen_mode" });
    vi.mocked(scenarioRepo.findById).mockResolvedValue(Result.ok(scenario));

    const uc = new StartSimulatorAttempt({
      attemptRepo,
      scenarioRepo,
      idGen,
      clock,
      recordAuditLog,
    });

    const result = await uc.execute({
      userId: "user_mode",
      simulatorId: "listing-audit",
      scenarioId: "scen_mode",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.mode).toBe("practice");
  });

  it("respects explicit mode parameter", async () => {
    const scenario = makeScenario({ id: "scen_explicit_mode" });
    vi.mocked(scenarioRepo.findById).mockResolvedValue(Result.ok(scenario));

    const uc = new StartSimulatorAttempt({
      attemptRepo,
      scenarioRepo,
      idGen,
      clock,
      recordAuditLog,
    });

    const result = await uc.execute({
      userId: "user_explicit",
      simulatorId: "str-triage",
      scenarioId: "scen_explicit_mode",
      mode: "challenge",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.mode).toBe("challenge");
  });

  it("returns db_error when repo create fails", async () => {
    const scenario = makeScenario({ id: "scen_dbfail" });
    vi.mocked(scenarioRepo.findById).mockResolvedValue(Result.ok(scenario));
    vi.mocked(attemptRepo.create).mockResolvedValue(
      Result.err({ kind: "db_error", message: "connection refused" }),
    );

    const uc = new StartSimulatorAttempt({
      attemptRepo,
      scenarioRepo,
      idGen,
      clock,
      recordAuditLog,
    });

    const result = await uc.execute({
      userId: "user_dbfail",
      simulatorId: "bid-elevator",
      scenarioId: "scen_dbfail",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });
});

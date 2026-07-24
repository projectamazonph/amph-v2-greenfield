/**
 * SaveSimulatorDecision use case tests.
 *
 * STORY-064: Simulator Attempt Infrastructure.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { Result } from "@/domain/shared/Result";
import { SaveSimulatorDecision } from "@/usecases/SaveSimulatorDecision";
import type { ISimulatorAttemptRepository } from "@/ports/repositories/ISimulatorAttemptRepository";
import type { SimulatorAttempt } from "@/domain/entities/SimulatorAttempt";
import type { SimulatorDecision } from "@/domain/entities/SimulatorDecision";

function makeAttempt(overrides: Partial<SimulatorAttempt> = {}): SimulatorAttempt {
  return {
    id: overrides.id ?? "att_01",
    attemptId: overrides.attemptId ?? "ATT-001",
    userId: overrides.userId ?? "user_01",
    simulatorId: (overrides.simulatorId ?? "bid-elevator") as SimulatorAttempt["simulatorId"],
    scenarioId: overrides.scenarioId ?? "scen_01",
    scenarioVersion: overrides.scenarioVersion ?? 1,
    difficulty: overrides.difficulty ?? "beginner",
    mode: overrides.mode ?? "practice",
    status: overrides.status ?? "in_progress",
    seed: overrides.seed ?? "SEED123",
    score: overrides.score ?? null,
    scoreDimensions: overrides.scoreDimensions ?? null,
    startedAt: overrides.startedAt ?? new Date(),
    submittedAt: overrides.submittedAt ?? null,
    gradedAt: overrides.gradedAt ?? null,
    decisions: overrides.decisions ?? [],
  };
}

function makeAttemptRepo(): ISimulatorAttemptRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findByAttemptId: vi.fn(),
    findByUserAndScenario: vi.fn(),
    addDecision: vi.fn().mockResolvedValue(Result.ok(undefined)),
    updateStatus: vi.fn(),
  };
}

describe("SaveSimulatorDecision", () => {
  let attemptRepo: ISimulatorAttemptRepository;

  beforeEach(() => {
    attemptRepo = makeAttemptRepo();
  });

  // ── Happy path ───────────────────────────────────────────────

  it("valid attempt in_progress -> saves decision, returns revision info", async () => {
    const attempt = makeAttempt({ id: "att_happy", decisions: [] });
    vi.mocked(attemptRepo.findByAttemptId).mockResolvedValue(Result.ok(attempt));
    vi.mocked(attemptRepo.addDecision).mockResolvedValue(Result.ok(undefined));

    const uc = new SaveSimulatorDecision({ attemptRepo });

    const result = await uc.execute({
      attemptId: "ATT-001",
      decisionData: { action: "increase_bid", bid: 1.5 },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.revision).toBe(1);
    expect(result.value.decisionData).toEqual({ action: "increase_bid", bid: 1.5 });
    expect(attemptRepo.addDecision).toHaveBeenCalledOnce();
  });

  it("second decision -> revision=2", async () => {
    const existingDecision: SimulatorDecision = {
      id: "dec_01",
      attemptId: "att_rev2",
      revision: 1,
      decisionData: { action: "first" },
      submittedAt: new Date(),
    };
    const attempt = makeAttempt({
      id: "att_rev2",
      decisions: [existingDecision],
    });
    vi.mocked(attemptRepo.findByAttemptId).mockResolvedValue(Result.ok(attempt));
    vi.mocked(attemptRepo.addDecision).mockResolvedValue(Result.ok(undefined));

    const uc = new SaveSimulatorDecision({ attemptRepo });

    const result = await uc.execute({
      attemptId: "ATT-REV2",
      decisionData: { action: "second" },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.revision).toBe(2);
  });

  // ── Error cases ──────────────────────────────────────────────

  it("attempt not found -> returns attempt_not_found", async () => {
    vi.mocked(attemptRepo.findByAttemptId).mockResolvedValue(Result.ok(null));

    const uc = new SaveSimulatorDecision({ attemptRepo });

    const result = await uc.execute({
      attemptId: "ATT-GHOST",
      decisionData: { action: "ghost" },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("attempt_not_found");
  });

  it("attempt already submitted -> returns attempt_not_in_progress", async () => {
    const submittedAttempt = makeAttempt({
      id: "att_submitted",
      status: "submitted",
    });
    vi.mocked(attemptRepo.findByAttemptId).mockResolvedValue(Result.ok(submittedAttempt));

    const uc = new SaveSimulatorDecision({ attemptRepo });

    const result = await uc.execute({
      attemptId: "ATT-SUB",
      decisionData: { action: "too_late" },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("attempt_not_in_progress");
  });

  it("attempt already graded -> returns attempt_not_in_progress", async () => {
    const gradedAttempt = makeAttempt({
      id: "att_graded",
      status: "graded",
    });
    vi.mocked(attemptRepo.findByAttemptId).mockResolvedValue(Result.ok(gradedAttempt));

    const uc = new SaveSimulatorDecision({ attemptRepo });

    const result = await uc.execute({
      attemptId: "ATT-GRADED",
      decisionData: { action: "after_graded" },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("attempt_not_in_progress");
  });

  it("empty decisionData {} -> returns empty_submission", async () => {
    const attempt = makeAttempt({ id: "att_empty" });
    vi.mocked(attemptRepo.findByAttemptId).mockResolvedValue(Result.ok(attempt));

    const uc = new SaveSimulatorDecision({ attemptRepo });

    const result = await uc.execute({
      attemptId: "ATT-EMPTY",
      decisionData: {},
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("empty_submission");
  });

  it("returns db_error when addDecision fails", async () => {
    const attempt = makeAttempt({ id: "att_dbfail" });
    vi.mocked(attemptRepo.findByAttemptId).mockResolvedValue(Result.ok(attempt));
    vi.mocked(attemptRepo.addDecision).mockResolvedValue(
      Result.err({ kind: "db_error", message: "connection lost" }),
    );

    const uc = new SaveSimulatorDecision({ attemptRepo });

    const result = await uc.execute({
      attemptId: "ATT-DBERR",
      decisionData: { action: "fail" },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });

  it("attempt already expired -> returns attempt_not_in_progress", async () => {
    const expiredAttempt = makeAttempt({
      id: "att_expired",
      status: "expired",
    });
    vi.mocked(attemptRepo.findByAttemptId).mockResolvedValue(Result.ok(expiredAttempt));

    const uc = new SaveSimulatorDecision({ attemptRepo });

    const result = await uc.execute({
      attemptId: "ATT-EXPIRED",
      decisionData: { action: "after_expired" },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("attempt_not_in_progress");
  });
});

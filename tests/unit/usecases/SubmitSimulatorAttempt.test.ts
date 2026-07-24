/**
 * SubmitSimulatorAttempt use case tests.
 *
 * STORY-064: Simulator Attempt Infrastructure.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { Result } from "@/domain/shared/Result";
import { SubmitSimulatorAttempt } from "@/usecases/SubmitSimulatorAttempt";
import type { ISimulatorAttemptRepository } from "@/ports/repositories/ISimulatorAttemptRepository";
import type { SimulatorAttempt } from "@/domain/entities/SimulatorAttempt";
import type { SimulatorDecision } from "@/domain/entities/SimulatorDecision";

function makeDecision(overrides: Partial<SimulatorDecision> = {}): SimulatorDecision {
  return {
    id: overrides.id ?? "dec_01",
    attemptId: overrides.attemptId ?? "att_01",
    revision: overrides.revision ?? 1,
    decisionData: overrides.decisionData ?? { action: "test" },
    submittedAt: overrides.submittedAt ?? new Date(),
  };
}

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
    addDecision: vi.fn(),
    updateStatus: vi.fn().mockResolvedValue(Result.ok({} as SimulatorAttempt)),
  };
}

describe("SubmitSimulatorAttempt", () => {
  let attemptRepo: ISimulatorAttemptRepository;

  beforeEach(() => {
    attemptRepo = makeAttemptRepo();
  });

  // ── Happy path ─────────────────────────────────────────────

  it("has decisions, in_progress -> transitions to submitted", async () => {
    const attempt = makeAttempt({
      id: "att_submit",
      decisions: [makeDecision({ id: "dec_s1" }), makeDecision({ id: "dec_s2" })],
    });
    vi.mocked(attemptRepo.findByAttemptId).mockResolvedValue(Result.ok(attempt));
    vi.mocked(attemptRepo.updateStatus).mockResolvedValue(
      Result.ok({ ...attempt, status: "submitted" as const, submittedAt: new Date() }),
    );

    const uc = new SubmitSimulatorAttempt({ attemptRepo });

    const result = await uc.execute({ attemptId: "ATT-001" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe("submitted");
    expect(result.value.submittedAt).not.toBeNull();
    expect(attemptRepo.updateStatus).toHaveBeenCalledWith("att_submit", "submitted");
  });

  // ── Idempotency ─────────────────────────────────────────────

  it("already_submitted attempt -> returns already_submitted", async () => {
    const attempt = makeAttempt({
      id: "att_idem",
      decisions: [makeDecision()],
      status: "submitted",
      submittedAt: new Date("2026-07-01T10:00:00Z"),
    });
    vi.mocked(attemptRepo.findByAttemptId).mockResolvedValue(Result.ok(attempt));

    const uc = new SubmitSimulatorAttempt({ attemptRepo });

    // Both calls return already_submitted since the attempt is already submitted
    const r1 = await uc.execute({ attemptId: "ATT-IDEM", idempotencyKey: "idem_abc" });
    expect(r1.ok).toBe(false);
    if (r1.ok) return;
    expect(r1.error.kind).toBe("already_submitted");

    // Second call with same key — same result
    const r2 = await uc.execute({ attemptId: "ATT-IDEM", idempotencyKey: "idem_abc" });
    expect(r2.ok).toBe(false);
    if (r2.ok) return;
    expect(r2.error.kind).toBe("already_submitted");
    // updateStatus should NOT have been called
    expect(attemptRepo.updateStatus).not.toHaveBeenCalled();
  });

  // ── Error cases ──────────────────────────────────────────────

  it("no decisions -> returns no_decisions_made", async () => {
    const attempt = makeAttempt({ id: "att_empty", decisions: [] });
    vi.mocked(attemptRepo.findByAttemptId).mockResolvedValue(Result.ok(attempt));

    const uc = new SubmitSimulatorAttempt({ attemptRepo });

    const result = await uc.execute({ attemptId: "ATT-EMPTY" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("no_decisions_made");
  });

  it("attempt not found -> returns attempt_not_found", async () => {
    vi.mocked(attemptRepo.findByAttemptId).mockResolvedValue(Result.ok(null));

    const uc = new SubmitSimulatorAttempt({ attemptRepo });

    const result = await uc.execute({ attemptId: "ATT-GHOST" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("attempt_not_found");
  });

  it("attempt already graded -> returns attempt_not_in_progress", async () => {
    const attempt = makeAttempt({
      id: "att_graded",
      status: "graded",
      submittedAt: new Date(),
    });
    vi.mocked(attemptRepo.findByAttemptId).mockResolvedValue(Result.ok(attempt));

    const uc = new SubmitSimulatorAttempt({ attemptRepo });

    const result = await uc.execute({ attemptId: "ATT-GRADED" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("attempt_not_in_progress");
  });

  it("attempt expired -> returns attempt_not_in_progress", async () => {
    const attempt = makeAttempt({
      id: "att_expired",
      status: "expired",
    });
    vi.mocked(attemptRepo.findByAttemptId).mockResolvedValue(Result.ok(attempt));

    const uc = new SubmitSimulatorAttempt({ attemptRepo });

    const result = await uc.execute({ attemptId: "ATT-EXPIRED" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("attempt_not_in_progress");
  });

  it("returns db_error when updateStatus fails", async () => {
    const attempt = makeAttempt({ id: "att_dbfail", decisions: [makeDecision()] });
    vi.mocked(attemptRepo.findByAttemptId).mockResolvedValue(Result.ok(attempt));
    vi.mocked(attemptRepo.updateStatus).mockResolvedValue(
      Result.err({ kind: "db_error", message: "network error" }),
    );

    const uc = new SubmitSimulatorAttempt({ attemptRepo });

    const result = await uc.execute({ attemptId: "ATT-DBERR" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });
});

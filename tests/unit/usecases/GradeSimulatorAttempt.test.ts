/**
 * GradeSimulatorAttempt use case tests.
 *
 * STORY-065: Scoring Engine + Dimensional Policies.
 */

import { describe, it, expect, vi } from "vitest";
import { Result } from "@/domain/shared/Result";
import { GradeSimulatorAttempt } from "@/usecases/GradeSimulatorAttempt";
import type { ISimulatorAttemptRepository } from "@/ports/repositories/ISimulatorAttemptRepository";
import type { IScorePolicyRepository } from "@/ports/repositories/IScorePolicyRepository";
import type { ScorePolicy } from "@/domain/entities/ScorePolicy";
import type { SimulatorAttempt } from "@/domain/entities/SimulatorAttempt";
import type { GradeSimulatorAttemptError } from "@/usecases/GradeSimulatorAttempt";

function makeSubmittedAttempt(overrides?: Partial<SimulatorAttempt>): SimulatorAttempt {
  return {
    id: "att_id_01",
    attemptId: "ATT-ABC123",
    userId: "user_01",
    simulatorId: "bid-elevator",
    scenarioId: "scen_01",
    scenarioVersion: 1,
    difficulty: "beginner",
    mode: "practice",
    status: "submitted",
    seed: "SEED1234",
    score: null,
    scoreDimensions: null,
    startedAt: new Date("2026-07-24T10:00:00Z"),
    submittedAt: new Date("2026-07-24T10:30:00Z"),
    gradedAt: null,
    decisions: [],
    ...overrides,
  };
}

function makePolicy(overrides?: Partial<ScorePolicy>): ScorePolicy {
  return {
    id: "pol_01",
    simulatorId: "bid-elevator",
    difficulty: "beginner",
    mode: "practice",
    dimensionConfig: {
      direction: { weight: 0.4, passingThreshold: 80 },
      magnitude: { weight: 0.3, passingThreshold: 70 },
      profitability: { weight: 0.3, passingThreshold: 75 },
    },
    passingScore: 70,
    createdAt: new Date("2026-07-24T00:00:00Z"),
    updatedAt: new Date("2026-07-24T00:00:00Z"),
    ...overrides,
  };
}

function makeAttemptRepo(): ISimulatorAttemptRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findByAttemptId: vi.fn(),
    findByUserAndScenario: vi.fn(),
    addDecision: vi.fn(),
    updateStatus: vi.fn(),
  };
}

function makeScorePolicyRepo(): IScorePolicyRepository {
  return {
    findBySimulatorAndDifficulty: vi.fn(),
    findBySimulator: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };
}

describe("GradeSimulatorAttempt", () => {
  it("grades a submitted attempt and returns score and dimensions", async () => {
    const attemptRepo = makeAttemptRepo();
    const scorePolicyRepo = makeScorePolicyRepo();

    const submittedAttempt = makeSubmittedAttempt();
    const gradedAttempt = makeSubmittedAttempt({
      status: "graded",
      score: 65,
      scoreDimensions: { direction: 80, magnitude: 60, profitability: 50 },
      gradedAt: new Date("2026-07-24T11:00:00Z"),
    });

    (attemptRepo.findByAttemptId as ReturnType<typeof vi.fn>).mockResolvedValue(
      Result.ok(submittedAttempt),
    );
    (scorePolicyRepo.findBySimulatorAndDifficulty as ReturnType<typeof vi.fn>).mockResolvedValue(
      Result.ok(makePolicy()),
    );
    (attemptRepo.updateStatus as ReturnType<typeof vi.fn>).mockResolvedValue(
      Result.ok(gradedAttempt),
    );

    const useCase = new GradeSimulatorAttempt({ attemptRepo, scorePolicyRepo });
    const result = await useCase.execute({
      attemptId: "ATT-ABC123",
      scoreDimensions: { direction: 80, magnitude: 60, profitability: 50 },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.attemptId).toBe("ATT-ABC123");
    expect(result.value.overallScore).toBe(65);
    expect(result.value.isPassed).toBe(false); // 65 < 70
  });

  it("returns attempt_not_found when the attempt does not exist", async () => {
    const attemptRepo = makeAttemptRepo();
    const scorePolicyRepo = makeScorePolicyRepo();
    (attemptRepo.findByAttemptId as ReturnType<typeof vi.fn>).mockResolvedValue(Result.ok(null));

    const useCase = new GradeSimulatorAttempt({ attemptRepo, scorePolicyRepo });
    const result = await useCase.execute({
      attemptId: "ATT-DNE",
      scoreDimensions: { direction: 80 },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    const err = result.error as GradeSimulatorAttemptError;
    expect(err.kind).toBe("attempt_not_found");
  });

  it("returns attempt_not_submitted when the attempt is in_progress", async () => {
    const attemptRepo = makeAttemptRepo();
    const scorePolicyRepo = makeScorePolicyRepo();
    (attemptRepo.findByAttemptId as ReturnType<typeof vi.fn>).mockResolvedValue(
      Result.ok(makeSubmittedAttempt({ status: "in_progress" })),
    );

    const useCase = new GradeSimulatorAttempt({ attemptRepo, scorePolicyRepo });
    const result = await useCase.execute({
      attemptId: "ATT-ABC123",
      scoreDimensions: { direction: 80 },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    const err = result.error as GradeSimulatorAttemptError;
    expect(err.kind).toBe("attempt_not_submitted");
  });

  it("returns attempt_already_graded when the attempt is graded", async () => {
    const attemptRepo = makeAttemptRepo();
    const scorePolicyRepo = makeScorePolicyRepo();
    (attemptRepo.findByAttemptId as ReturnType<typeof vi.fn>).mockResolvedValue(
      Result.ok(makeSubmittedAttempt({ status: "graded" })),
    );

    const useCase = new GradeSimulatorAttempt({ attemptRepo, scorePolicyRepo });
    const result = await useCase.execute({
      attemptId: "ATT-ABC123",
      scoreDimensions: { direction: 80 },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    const err = result.error as GradeSimulatorAttemptError;
    expect(err.kind).toBe("attempt_already_graded");
  });

  it("returns policy_not_found when no policy exists", async () => {
    const attemptRepo = makeAttemptRepo();
    const scorePolicyRepo = makeScorePolicyRepo();
    (attemptRepo.findByAttemptId as ReturnType<typeof vi.fn>).mockResolvedValue(
      Result.ok(makeSubmittedAttempt()),
    );
    (scorePolicyRepo.findBySimulatorAndDifficulty as ReturnType<typeof vi.fn>).mockResolvedValue(
      Result.ok(null),
    );

    const useCase = new GradeSimulatorAttempt({ attemptRepo, scorePolicyRepo });
    const result = await useCase.execute({
      attemptId: "ATT-ABC123",
      scoreDimensions: { direction: 80 },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    const err = result.error as GradeSimulatorAttemptError;
    expect(err.kind).toBe("policy_not_found");
  });

  it("returns invalid_dimensions when a dimension key is not in the policy", async () => {
    const attemptRepo = makeAttemptRepo();
    const scorePolicyRepo = makeScorePolicyRepo();
    (attemptRepo.findByAttemptId as ReturnType<typeof vi.fn>).mockResolvedValue(
      Result.ok(makeSubmittedAttempt()),
    );
    (scorePolicyRepo.findBySimulatorAndDifficulty as ReturnType<typeof vi.fn>).mockResolvedValue(
      Result.ok(makePolicy()),
    );

    const useCase = new GradeSimulatorAttempt({ attemptRepo, scorePolicyRepo });
    const result = await useCase.execute({
      attemptId: "ATT-ABC123",
      scoreDimensions: { totallyFake: 50 },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    const err = result.error as GradeSimulatorAttemptError;
    expect(err.kind).toBe("invalid_dimensions");
    if (err.kind !== "invalid_dimensions") return;
    expect(err.missing).toContain("totallyFake");
  });

  it("maps db_error from findByAttemptId", async () => {
    const attemptRepo = makeAttemptRepo();
    const scorePolicyRepo = makeScorePolicyRepo();
    (attemptRepo.findByAttemptId as ReturnType<typeof vi.fn>).mockResolvedValue(
      Result.err({ kind: "db_error", message: "Connection failed" }),
    );

    const useCase = new GradeSimulatorAttempt({ attemptRepo, scorePolicyRepo });
    const result = await useCase.execute({
      attemptId: "ATT-ABC123",
      scoreDimensions: { direction: 80 },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    const err = result.error as GradeSimulatorAttemptError;
    expect(err.kind).toBe("db_error");
  });
});

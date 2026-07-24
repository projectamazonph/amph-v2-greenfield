/**
 * ComposeAttemptFeedback use case tests.
 *
 * STORY-066: Feedback Composer + Remediation Recommendations.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Result } from "@/domain/shared/Result";
import { ComposeAttemptFeedback } from "@/usecases/ComposeAttemptFeedback";
import type { SimulatorAttempt } from "@/domain/entities/SimulatorAttempt";
import type { ScorePolicy } from "@/domain/entities/ScorePolicy";
import type {
  IAttemptFeedbackRepository,
  AttemptFeedbackError,
} from "@/ports/repositories/IAttemptFeedbackRepository";
import type { ISimulatorAttemptRepository } from "@/ports/repositories/ISimulatorAttemptRepository";
import type { IScorePolicyRepository } from "@/ports/repositories/IScorePolicyRepository";

const GRADED_ATTEMPT: SimulatorAttempt = {
  id: "attempt-1",
  attemptId: "ATT-ABC123",
  userId: "user-1",
  simulatorId: "bid-elevator",
  scenarioId: "scenario-1",
  scenarioVersion: 1,
  difficulty: "beginner",
  mode: "practice",
  status: "graded",
  seed: "SEED1234",
  score: 85,
  scoreDimensions: { direction: 90, magnitude: 80, profitability: 85 },
  startedAt: new Date(),
  submittedAt: new Date(),
  gradedAt: new Date(),
  decisions: [],
};

const SCORE_POLICY: ScorePolicy = {
  id: "policy-1",
  simulatorId: "bid-elevator",
  difficulty: "beginner",
  mode: "practice",
  dimensionConfig: {
    direction: { weight: 0.3, passingThreshold: 70 },
    magnitude: { weight: 0.3, passingThreshold: 70 },
    profitability: { weight: 0.4, passingThreshold: 70 },
  },
  passingScore: 70,
  createdAt: new Date(),
  updatedAt: new Date(),
};

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

function makeFeedbackRepo(): IAttemptFeedbackRepository {
  return {
    create: vi.fn(),
    findByAttemptId: vi.fn(),
    findByUserId: vi.fn(),
  };
}

describe("ComposeAttemptFeedback", () => {
  it("happy path: loads attempt, finds policy, composes, persists", async () => {
    const attemptRepo = makeAttemptRepo();
    const scorePolicyRepo = makeScorePolicyRepo();
    const feedbackRepo = makeFeedbackRepo();

    (attemptRepo.findByAttemptId as ReturnType<typeof vi.fn>).mockResolvedValue(
      Result.ok(GRADED_ATTEMPT),
    );
    (scorePolicyRepo.findBySimulatorAndDifficulty as ReturnType<typeof vi.fn>).mockResolvedValue(
      Result.ok(SCORE_POLICY),
    );
    (feedbackRepo.create as ReturnType<typeof vi.fn>).mockResolvedValue(Result.ok(undefined));

    const useCase = new ComposeAttemptFeedback({
      attemptRepo,
      scorePolicyRepo,
      feedbackRepo,
    });

    const result = await useCase.execute({ attemptId: "attempt-1" });

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.feedback.attemptId).toBe("attempt-1");
      expect(result.value.feedback.passed).toBe(true);
      expect(result.value.feedback.overallScore).toBe(85);
    }

    expect(attemptRepo.findByAttemptId).toHaveBeenCalledWith("attempt-1");
    expect(scorePolicyRepo.findBySimulatorAndDifficulty).toHaveBeenCalled();
    expect(feedbackRepo.create).toHaveBeenCalled();
  });

  it("returns attempt_not_found when attempt does not exist", async () => {
    const attemptRepo = makeAttemptRepo();
    const scorePolicyRepo = makeScorePolicyRepo();
    const feedbackRepo = makeFeedbackRepo();

    (attemptRepo.findByAttemptId as ReturnType<typeof vi.fn>).mockResolvedValue(Result.ok(null));

    const useCase = new ComposeAttemptFeedback({
      attemptRepo,
      scorePolicyRepo,
      feedbackRepo,
    });

    const result = await useCase.execute({ attemptId: "nonexistent" });

    expect(Result.isErr(result)).toBe(true);
    if (Result.isErr(result)) {
      expect(result.error.kind).toBe("attempt_not_found");
    }
  });

  it("returns attempt_not_graded when attempt status is not graded", async () => {
    const attemptRepo = makeAttemptRepo();
    const scorePolicyRepo = makeScorePolicyRepo();
    const feedbackRepo = makeFeedbackRepo();

    const inProgressAttempt: SimulatorAttempt = {
      ...GRADED_ATTEMPT,
      id: "attempt-in-progress",
      status: "in_progress",
      score: null,
      scoreDimensions: null,
    };
    (attemptRepo.findByAttemptId as ReturnType<typeof vi.fn>).mockResolvedValue(
      Result.ok(inProgressAttempt),
    );

    const useCase = new ComposeAttemptFeedback({
      attemptRepo,
      scorePolicyRepo,
      feedbackRepo,
    });

    const result = await useCase.execute({ attemptId: "attempt-in-progress" });

    expect(Result.isErr(result)).toBe(true);
    if (Result.isErr(result)) {
      expect(result.error.kind).toBe("attempt_not_graded");
    }
  });

  it("returns policy_not_found when no matching ScorePolicy", async () => {
    const attemptRepo = makeAttemptRepo();
    const scorePolicyRepo = makeScorePolicyRepo();
    const feedbackRepo = makeFeedbackRepo();

    (attemptRepo.findByAttemptId as ReturnType<typeof vi.fn>).mockResolvedValue(
      Result.ok(GRADED_ATTEMPT),
    );
    (scorePolicyRepo.findBySimulatorAndDifficulty as ReturnType<typeof vi.fn>).mockResolvedValue(
      Result.ok(null),
    );

    const useCase = new ComposeAttemptFeedback({
      attemptRepo,
      scorePolicyRepo,
      feedbackRepo,
    });

    const result = await useCase.execute({ attemptId: "attempt-1" });

    expect(Result.isErr(result)).toBe(true);
    if (Result.isErr(result)) {
      expect(result.error.kind).toBe("policy_not_found");
    }
  });

  it("returns db_error when repository write fails", async () => {
    const attemptRepo = makeAttemptRepo();
    const scorePolicyRepo = makeScorePolicyRepo();
    const feedbackRepo = makeFeedbackRepo();

    (attemptRepo.findByAttemptId as ReturnType<typeof vi.fn>).mockResolvedValue(
      Result.ok(GRADED_ATTEMPT),
    );
    (scorePolicyRepo.findBySimulatorAndDifficulty as ReturnType<typeof vi.fn>).mockResolvedValue(
      Result.ok(SCORE_POLICY),
    );
    const dbErr: AttemptFeedbackError = { kind: "db_error", message: "Connection lost" };
    (feedbackRepo.create as ReturnType<typeof vi.fn>).mockResolvedValue(Result.err(dbErr));

    const useCase = new ComposeAttemptFeedback({
      attemptRepo,
      scorePolicyRepo,
      feedbackRepo,
    });

    const result = await useCase.execute({ attemptId: "attempt-1" });

    expect(Result.isErr(result)).toBe(true);
    if (Result.isErr(result)) {
      expect(result.error.kind).toBe("db_error");
    }
  });

  it("maps attempt repo db_error correctly", async () => {
    const attemptRepo = makeAttemptRepo();
    const scorePolicyRepo = makeScorePolicyRepo();
    const feedbackRepo = makeFeedbackRepo();

    (attemptRepo.findByAttemptId as ReturnType<typeof vi.fn>).mockResolvedValue(
      Result.err({ kind: "db_error", message: "Attempt query failed" } as never),
    );

    const useCase = new ComposeAttemptFeedback({
      attemptRepo,
      scorePolicyRepo,
      feedbackRepo,
    });

    const result = await useCase.execute({ attemptId: "attempt-1" });

    expect(Result.isErr(result)).toBe(true);
    if (Result.isErr(result)) {
      expect(result.error.kind).toBe("db_error");
    }
  });
});

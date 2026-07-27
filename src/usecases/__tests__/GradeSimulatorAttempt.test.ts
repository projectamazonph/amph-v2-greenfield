/**
 * GradeSimulatorAttempt — applies a ScorePolicy to a submitted attempt.
 * STORY-065.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { GradeSimulatorAttempt } from "../GradeSimulatorAttempt";
import { InMemorySimulatorAttemptRepository } from "@/infra/repositories/InMemorySimulatorAttemptRepository";
import { InMemoryScorePolicyRepository } from "@/infra/repositories/InMemoryScorePolicyRepository";
import { createSimulatorAttempt } from "@/domain/entities/SimulatorAttempt";
import { createScorePolicy } from "@/domain/entities/ScorePolicy";
import { FixedClock } from "@/ports/system/Clock";

function makeAttempt(status: "submitted" | "in_progress" | "graded" = "submitted") {
  return {
    ...createSimulatorAttempt({
      id: "id_1",
      attemptId: "ATT-ABC1234",
      userId: "u_1",
      simulatorId: "bid-elevator",
      scenarioId: "scn_1",
      difficulty: "beginner",
      mode: "practice",
      seed: "SEED0001",
    }),
    status,
  };
}

function makePolicyRepoWithSingleDimension(
  simulatorId:
    "bid-elevator" | "str-triage" | "campaign-builder" | "listing-audit" = "bid-elevator",
  difficulty: "beginner" | "intermediate" | "advanced" = "beginner",
  mode: "guided" | "practice" | "challenge" | "credential" | "instructor" = "practice",
  dimensionConfig: Record<string, { weight: number; passingThreshold: number }> = {
    direction: { weight: 1, passingThreshold: 70 },
  },
  passingScore = 70,
) {
  const repo = new InMemoryScorePolicyRepository();
  const r = createScorePolicy({
    id: "policy_1",
    simulatorId,
    difficulty,
    mode,
    dimensionConfig,
    passingScore,
    createdAt: new Date("2025-01-01T00:00:00Z"),
    updatedAt: new Date("2025-01-01T00:00:00Z"),
  });
  if (!r.ok) throw new Error("policy seed failed");
  repo.create(r.value);
  return repo;
}

describe("GradeSimulatorAttempt", () => {
  let attemptRepo: InMemorySimulatorAttemptRepository;
  let scorePolicyRepo: InMemoryScorePolicyRepository;
  let clock: FixedClock;
  let useCase: GradeSimulatorAttempt;

  beforeEach(() => {
    attemptRepo = new InMemorySimulatorAttemptRepository();
    scorePolicyRepo = makePolicyRepoWithSingleDimension();
    clock = new FixedClock(new Date("2025-02-01T00:00:00Z"));
    useCase = new GradeSimulatorAttempt({ attemptRepo, scorePolicyRepo });
    // Suppress unused warnings — clock isn't injected today but kept for parity.
    void clock;
  });

  it("grades a passing attempt and persists score + dimensions", async () => {
    attemptRepo.create(makeAttempt("submitted"));

    const r = await useCase.execute({
      attemptId: "ATT-ABC1234",
      scoreDimensions: { direction: 90 },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.attemptId).toBe("ATT-ABC1234");
    expect(r.value.overallScore).toBe(90);
    expect(r.value.isPassed).toBe(true);
    expect(r.value.scoreDimensions).toEqual({ direction: 90 });
    expect(r.value.gradedAt).toBeInstanceOf(Date);

    const persisted = await attemptRepo.findByAttemptId("ATT-ABC1234");
    expect(persisted.ok).toBe(true);
    if (!persisted.ok || !persisted.value) return;
    expect(persisted.value.status).toBe("graded");
    expect(persisted.value.score).toBe(90);
    expect(persisted.value.scoreDimensions).toEqual({ direction: 90 });
    expect(persisted.value.gradedAt).toBeInstanceOf(Date);
  });

  it("grades a failing attempt below passingScore", async () => {
    attemptRepo.create(makeAttempt("submitted"));

    const r = await useCase.execute({
      attemptId: "ATT-ABC1234",
      scoreDimensions: { direction: 40 },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.overallScore).toBe(40);
    expect(r.value.isPassed).toBe(false);
  });

  it("computes weighted average across simulator-specific dimensions", async () => {
    // Bid Elevator: bidAccuracy 0.4, budgetAdherence 0.3, roasHit 0.3, passingScore 60
    const repo = makePolicyRepoWithSingleDimension(
      "bid-elevator",
      "beginner",
      "practice",
      {
        bidAccuracy: { weight: 0.4, passingThreshold: 70 },
        budgetAdherence: { weight: 0.3, passingThreshold: 70 },
        roasHit: { weight: 0.3, passingThreshold: 70 },
      },
      60,
    );
    const uc = new GradeSimulatorAttempt({ attemptRepo, scorePolicyRepo: repo });
    attemptRepo.create(makeAttempt("submitted"));

    const r = await uc.execute({
      attemptId: "ATT-ABC1234",
      scoreDimensions: { bidAccuracy: 100, budgetAdherence: 0, roasHit: 50 },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // 100 * 0.4 + 0 * 0.3 + 50 * 0.3 = 40 + 0 + 15 = 55
    expect(r.value.overallScore).toBe(55);
    expect(r.value.isPassed).toBe(false); // 55 < 60
  });

  it("clamps scores above 100 down to 100 in the weighted sum", async () => {
    const repo = makePolicyRepoWithSingleDimension(
      "bid-elevator",
      "beginner",
      "practice",
      { bidAccuracy: { weight: 1, passingThreshold: 70 } },
      70,
    );
    const uc = new GradeSimulatorAttempt({ attemptRepo, scorePolicyRepo: repo });
    attemptRepo.create(makeAttempt("submitted"));

    const r = await uc.execute({
      attemptId: "ATT-ABC1234",
      scoreDimensions: { bidAccuracy: 250 }, // over 100
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.overallScore).toBe(100);
  });

  it("returns attempt_not_found when the attempt is missing", async () => {
    const r = await useCase.execute({
      attemptId: "ATT-MISSING",
      scoreDimensions: { direction: 90 },
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("attempt_not_found");
  });

  it("returns attempt_not_submitted when the attempt is in_progress", async () => {
    attemptRepo.create(makeAttempt("in_progress"));
    const r = await useCase.execute({
      attemptId: "ATT-ABC1234",
      scoreDimensions: { direction: 90 },
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("attempt_not_submitted");
  });

  it("returns attempt_already_graded when the attempt is graded", async () => {
    attemptRepo.create(makeAttempt("graded"));
    const r = await useCase.execute({
      attemptId: "ATT-ABC1234",
      scoreDimensions: { direction: 90 },
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("attempt_already_graded");
  });

  it("returns policy_not_found when no policy matches the triple", async () => {
    const emptyPolicyRepo = new InMemoryScorePolicyRepository();
    const uc = new GradeSimulatorAttempt({
      attemptRepo,
      scorePolicyRepo: emptyPolicyRepo,
    });
    attemptRepo.create(makeAttempt("submitted"));

    const r = await uc.execute({
      attemptId: "ATT-ABC1234",
      scoreDimensions: { direction: 90 },
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("policy_not_found");
  });

  it("returns invalid_dimensions when an unknown key is supplied", async () => {
    attemptRepo.create(makeAttempt("submitted"));

    const r = await useCase.execute({
      attemptId: "ATT-ABC1234",
      scoreDimensions: { direction: 90, mystery: 50 },
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("invalid_dimensions");
    if (r.error.kind === "invalid_dimensions") {
      expect(r.error.missing).toContain("mystery");
    }
  });
});

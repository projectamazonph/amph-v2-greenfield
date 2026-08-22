/**
 * GradeSimulatorAttempt — applies a ScorePolicy to a submitted attempt.
 * STORY-065. STORY-086: clamps raw scores into per-scenario calibration
 * bands before the weighted-average overall.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { GradeSimulatorAttempt } from "../GradeSimulatorAttempt";
import { InMemorySimulatorAttemptRepository } from "@/infra/repositories/InMemorySimulatorAttemptRepository";
import { InMemoryScorePolicyRepository } from "@/infra/repositories/InMemoryScorePolicyRepository";
import { InMemorySimulatorScenarioCalibrationRepository } from "@/infra/repositories/inmemory/InMemorySimulatorScenarioCalibrationRepository";
import { InMemorySimulatorScenarioRepository } from "@/infra/simulator/InMemorySimulatorScenarioRepository";
import { createSimulatorAttempt } from "@/domain/entities/SimulatorAttempt";
import { createScorePolicy } from "@/domain/entities/ScorePolicy";
import { createSimulatorScenario } from "@/domain/entities/SimulatorScenario";
import { createSimulatorScenarioCalibration } from "@/domain/entities/SimulatorScenarioCalibration";
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
      startedAt: new Date("2025-02-01T00:00:00Z"),
    }),
    status,
  };
}

function makePolicyRepoWithSingleDimension(
  simulatorId:
    "bid-elevator" | "str-triage" | "campaign-builder" | "listing-audit" = "bid-elevator",
  difficulty: "beginner" | "intermediate" | "advanced" = "beginner",
  mode: "guided" | "practice" | "challenge" | "credential" | "instructor" = "practice",
  dimensionConfig: Record<string, { weight: number }> = {
    direction: { weight: 1 },
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

function seedScenario(scenarioRepo: InMemorySimulatorScenarioRepository) {
  const r = createSimulatorScenario({
    id: "scn_1",
    simulatorId: "bid-elevator",
    name: "Seed scenario",
    description: "Test",
    inputSchema: {},
    outputSchema: {},
    difficulty: "beginner",
    estimatedMinutes: 10,
    scenarioKey: "scenario-key-1",
  });
  if (!r.ok) throw new Error("scenario seed failed");
  scenarioRepo.seed(r.value);
}

describe("GradeSimulatorAttempt", () => {
  let attemptRepo: InMemorySimulatorAttemptRepository;
  let scorePolicyRepo: InMemoryScorePolicyRepository;
  let calibrationRepo: InMemorySimulatorScenarioCalibrationRepository;
  let scenarioRepo: InMemorySimulatorScenarioRepository;
  let clock: FixedClock;
  let useCase: GradeSimulatorAttempt;

  beforeEach(() => {
    attemptRepo = new InMemorySimulatorAttemptRepository();
    scorePolicyRepo = makePolicyRepoWithSingleDimension();
    calibrationRepo = new InMemorySimulatorScenarioCalibrationRepository();
    scenarioRepo = new InMemorySimulatorScenarioRepository();
    seedScenario(scenarioRepo);
    clock = new FixedClock(new Date("2025-02-01T12:00:00Z"));
    useCase = new GradeSimulatorAttempt({
      attemptRepo,
      scorePolicyRepo,
      calibrationRepo,
      scenarioRepo,
      clock,
    });
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
    // Clock is honored: gradedAt is the injected FixedClock value, not a fresh Date.now().
    expect(r.value.gradedAt).toEqual(new Date("2025-02-01T12:00:00Z"));

    const persisted = await attemptRepo.findByAttemptId("ATT-ABC1234");
    expect(persisted.ok).toBe(true);
    if (!persisted.ok || !persisted.value) return;
    expect(persisted.value.status).toBe("graded");
    expect(persisted.value.score).toBe(90);
    expect(persisted.value.scoreDimensions).toEqual({ direction: 90 });
    expect(persisted.value.gradedAt).toEqual(new Date("2025-02-01T12:00:00Z"));
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
        bidAccuracy: { weight: 0.4 },
        budgetAdherence: { weight: 0.3 },
        roasHit: { weight: 0.3 },
      },
      60,
    );
    const uc = new GradeSimulatorAttempt({
      attemptRepo,
      scorePolicyRepo: repo,
      calibrationRepo,
      scenarioRepo,
      clock,
    });
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
      { bidAccuracy: { weight: 1 } },
      70,
    );
    const uc = new GradeSimulatorAttempt({
      attemptRepo,
      scorePolicyRepo: repo,
      calibrationRepo,
      scenarioRepo,
      clock,
    });
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
      calibrationRepo,
      scenarioRepo,
      clock,
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

  // ── STORY-086: calibration clamping ────────────────────────────────────

  it("clamps an above-band raw score down to maxScore (STORY-086)", async () => {
    attemptRepo.create(makeAttempt("submitted"));

    // Seed a calibration band { 40..80 } for direction on scenario-key-1.
    const cal = createSimulatorScenarioCalibration({
      id: "cal_1",
      simulatorId: "bid-elevator",
      scenarioKey: "scenario-key-1",
      dimensionBands: { direction: { minScore: 40, maxScore: 80 } },
      instructorId: "admin_1",
      createdAt: new Date("2025-01-01T00:00:00Z"),
      updatedAt: new Date("2025-01-01T00:00:00Z"),
    });
    if (!cal.ok) throw new Error("calibration seed failed");
    await calibrationRepo.upsert(cal.value);

    const r = await useCase.execute({
      attemptId: "ATT-ABC1234",
      scoreDimensions: { direction: 95 }, // > maxScore 80
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.scoreDimensions).toEqual({ direction: 80 }); // clamped down
    expect(r.value.overallScore).toBe(80);
  });

  it("clamps an below-band raw score up to minScore (STORY-086)", async () => {
    attemptRepo.create(makeAttempt("submitted"));

    const cal = createSimulatorScenarioCalibration({
      id: "cal_1",
      simulatorId: "bid-elevator",
      scenarioKey: "scenario-key-1",
      dimensionBands: { direction: { minScore: 50, maxScore: 80 } },
      instructorId: "admin_1",
    });
    if (!cal.ok) throw new Error("calibration seed failed");
    await calibrationRepo.upsert(cal.value);

    const r = await useCase.execute({
      attemptId: "ATT-ABC1234",
      scoreDimensions: { direction: 20 }, // < minScore 50
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.scoreDimensions).toEqual({ direction: 50 });
  });

  it("passes scores inside the band through unchanged (STORY-086)", async () => {
    attemptRepo.create(makeAttempt("submitted"));

    const cal = createSimulatorScenarioCalibration({
      id: "cal_1",
      simulatorId: "bid-elevator",
      scenarioKey: "scenario-key-1",
      dimensionBands: { direction: { minScore: 40, maxScore: 90 } },
      instructorId: "admin_1",
    });
    if (!cal.ok) throw new Error("calibration seed failed");
    await calibrationRepo.upsert(cal.value);

    const r = await useCase.execute({
      attemptId: "ATT-ABC1234",
      scoreDimensions: { direction: 75 }, // inside band
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.scoreDimensions).toEqual({ direction: 75 });
  });

  it("grades normally when the attempt's scenario has no calibration (STORY-086)", async () => {
    // Empty calibrationRepo — no calibration rows.
    attemptRepo.create(makeAttempt("submitted"));

    const r = await useCase.execute({
      attemptId: "ATT-ABC1234",
      scoreDimensions: { direction: 95 },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.scoreDimensions).toEqual({ direction: 95 });
    expect(r.value.overallScore).toBe(95);
  });
});

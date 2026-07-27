/**
 * ComposeAttemptFeedback — generates feedback for a graded attempt.
 * STORY-066.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { ComposeAttemptFeedback } from "../ComposeAttemptFeedback";
import { InMemorySimulatorAttemptRepository } from "@/infra/repositories/InMemorySimulatorAttemptRepository";
import { InMemoryScorePolicyRepository } from "@/infra/repositories/InMemoryScorePolicyRepository";
import { InMemoryAttemptFeedbackRepository } from "@/infra/repositories/InMemoryAttemptFeedbackRepository";
import { createSimulatorAttempt } from "@/domain/entities/SimulatorAttempt";
import { createScorePolicy } from "@/domain/entities/ScorePolicy";
import type { ScoreDimensions, AttemptStatus } from "@/domain/entities/SimulatorAttempt";
import type { SimulatorId } from "@/domain/entities/SimulatorScenario";

function makeGradedAttempt(
  score: number,
  scoreDimensions: ScoreDimensions,
  overrides: Partial<{
    simulatorId: SimulatorId;
    difficulty: "beginner" | "intermediate" | "advanced";
    mode: "guided" | "practice" | "challenge" | "credential" | "instructor";
    status: AttemptStatus;
  }> = {},
) {
  const base = createSimulatorAttempt({
    id: "id_1",
    attemptId: "ATT-ABC1234",
    userId: "u_1",
    simulatorId: overrides.simulatorId ?? "bid-elevator",
    scenarioId: "scn_1",
    difficulty: overrides.difficulty ?? "beginner",
    mode: overrides.mode ?? "practice",
    seed: "SEED0001",
  });
  return {
    ...base,
    status: overrides.status ?? ("graded" as AttemptStatus),
    score,
    scoreDimensions,
    gradedAt: new Date("2025-02-01T00:00:00Z"),
  };
}

function seedPolicy(
  repo: InMemoryScorePolicyRepository,
  overrides: {
    simulatorId?: SimulatorId;
    difficulty?: "beginner" | "intermediate" | "advanced";
    mode?: "guided" | "practice" | "challenge" | "credential" | "instructor";
    passingScore?: number;
    dimensionConfig?: Record<string, { weight: number; passingThreshold: number }>;
  } = {},
) {
  const r = createScorePolicy({
    id: "policy_1",
    simulatorId: overrides.simulatorId ?? "bid-elevator",
    difficulty: overrides.difficulty ?? "beginner",
    mode: overrides.mode ?? "practice",
    dimensionConfig: overrides.dimensionConfig ?? {
      direction: { weight: 1, passingThreshold: 70 },
    },
    passingScore: overrides.passingScore ?? 70,
    createdAt: new Date("2025-01-01T00:00:00Z"),
    updatedAt: new Date("2025-01-01T00:00:00Z"),
  });
  if (!r.ok) throw new Error("policy seed failed");
  repo.create(r.value);
}

describe("ComposeAttemptFeedback", () => {
  let attemptRepo: InMemorySimulatorAttemptRepository;
  let scorePolicyRepo: InMemoryScorePolicyRepository;
  let feedbackRepo: InMemoryAttemptFeedbackRepository;
  let useCase: ComposeAttemptFeedback;

  beforeEach(() => {
    attemptRepo = new InMemorySimulatorAttemptRepository();
    scorePolicyRepo = new InMemoryScorePolicyRepository();
    feedbackRepo = new InMemoryAttemptFeedbackRepository();
    useCase = new ComposeAttemptFeedback({
      attemptRepo,
      scorePolicyRepo,
      feedbackRepo,
    });
    seedPolicy(scorePolicyRepo);
  });

  it("composes a passing attempt's feedback and persists it", async () => {
    attemptRepo.create(makeGradedAttempt(90, { direction: 90 }));

    const r = await useCase.execute({ attemptId: "ATT-ABC1234" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    const fb = r.value.feedback;
    expect(fb.attemptId).toBe("id_1"); // feedbackRepo is keyed by internal id
    expect(fb.userId).toBe("u_1");
    expect(fb.simulatorId).toBe("bid-elevator");
    expect(fb.difficulty).toBe("beginner");
    expect(fb.mode).toBe("practice");
    expect(fb.overallScore).toBe(90);
    expect(fb.passed).toBe(true);
    expect(fb.overallComment).toContain("bid strategy");
    expect(fb.remediationLinks.length).toBeGreaterThan(0);
    expect(fb.dimensionFeedback).toHaveLength(1);
    expect(fb.dimensionFeedback[0]?.dimension).toBe("direction");
    expect(fb.dimensionFeedback[0]?.score).toBe(90);
    expect(fb.dimensionFeedback[0]?.verdict).toBe("excellent");

    const persisted = await feedbackRepo.findByAttemptId("id_1");
    expect(persisted.ok).toBe(true);
    if (!persisted.ok) return;
    expect(persisted.value?.overallScore).toBe(90);
  });

  it("composes a failing attempt's feedback with verdict 'poor'", async () => {
    attemptRepo.create(makeGradedAttempt(40, { direction: 40 }));

    const r = await useCase.execute({ attemptId: "ATT-ABC1234" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    const fb = r.value.feedback;
    expect(fb.passed).toBe(false);
    expect(fb.overallComment).toContain("Review"); // fail comment
    expect(fb.dimensionFeedback[0]?.verdict).toBe("poor");
  });

  it("produces one dimensionFeedback entry per dimension", async () => {
    seedPolicy(scorePolicyRepo, {
      simulatorId: "bid-elevator",
      dimensionConfig: {
        bidAccuracy: { weight: 0.4, passingThreshold: 70 },
        budgetAdherence: { weight: 0.3, passingThreshold: 70 },
        roasHit: { weight: 0.3, passingThreshold: 70 },
      },
    });
    attemptRepo.create(
      makeGradedAttempt(70, { bidAccuracy: 80, budgetAdherence: 60, roasHit: 70 }),
    );

    const r = await useCase.execute({ attemptId: "ATT-ABC1234" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.feedback.dimensionFeedback).toHaveLength(3);
    expect(r.value.feedback.dimensionFeedback.map((d) => d.dimension).sort()).toEqual([
      "bidAccuracy",
      "budgetAdherence",
      "roasHit",
    ]);
  });

  it("uses simulator-specific pass/fail comments", async () => {
    attemptRepo.create(makeGradedAttempt(80, { direction: 80 }, { simulatorId: "listing-audit" }));
    seedPolicy(scorePolicyRepo, {
      simulatorId: "listing-audit",
      dimensionConfig: { direction: { weight: 1, passingThreshold: 70 } },
    });

    const r = await useCase.execute({ attemptId: "ATT-ABC1234" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.feedback.passed).toBe(true);
    expect(r.value.feedback.overallComment).toContain("audit");
  });

  it("returns attempt_not_found when the attempt is missing", async () => {
    const r = await useCase.execute({ attemptId: "ATT-MISSING" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("attempt_not_found");
  });

  it("returns attempt_not_graded when the attempt is submitted", async () => {
    attemptRepo.create(makeGradedAttempt(0, {}, { status: "submitted" }));
    const r = await useCase.execute({ attemptId: "ATT-ABC1234" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("attempt_not_graded");
  });

  it("returns policy_not_found when no policy matches", async () => {
    const emptyRepo = new InMemoryScorePolicyRepository();
    const uc = new ComposeAttemptFeedback({
      attemptRepo,
      scorePolicyRepo: emptyRepo,
      feedbackRepo,
    });
    attemptRepo.create(makeGradedAttempt(80, { direction: 80 }));

    const r = await uc.execute({ attemptId: "ATT-ABC1234" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("policy_not_found");
  });
});

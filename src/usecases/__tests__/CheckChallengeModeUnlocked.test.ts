/**
 * CheckChallengeModeUnlocked — STORY-088.
 */

import { describe, it, expect } from "vitest";
import { CheckChallengeModeUnlocked } from "../CheckChallengeModeUnlocked";
import { InMemorySimulatorAttemptRepository } from "@/infra/repositories/InMemorySimulatorAttemptRepository";
import { InMemoryScorePolicyRepository } from "@/infra/repositories/InMemoryScorePolicyRepository";
import { createSimulatorAttempt } from "@/domain/entities/SimulatorAttempt";
import type { SimulatorAttempt } from "@/domain/entities/SimulatorAttempt";
import { createScorePolicy } from "@/domain/entities/ScorePolicy";

function makeGradedAttempt(overrides: {
  id: string;
  userId: string;
  simulatorId: SimulatorAttempt["simulatorId"];
  mode?: SimulatorAttempt["mode"];
  difficulty?: SimulatorAttempt["difficulty"];
  score: number;
}): SimulatorAttempt {
  const base = createSimulatorAttempt({
    id: overrides.id,
    attemptId: `ATT-${overrides.id}`,
    userId: overrides.userId,
    simulatorId: overrides.simulatorId,
    scenarioId: "scn_1",
    difficulty: overrides.difficulty ?? "beginner",
    mode: overrides.mode ?? "practice",
    startedAt: new Date("2025-02-01T00:00:00Z"),
  });
  return { ...base, status: "graded", score: overrides.score };
}

function seedPolicy(
  policyRepo: InMemoryScorePolicyRepository,
  overrides: {
    simulatorId: SimulatorAttempt["simulatorId"];
    difficulty?: SimulatorAttempt["difficulty"];
    mode?: SimulatorAttempt["mode"];
    passingScore?: number;
  },
) {
  const r = createScorePolicy({
    id: `policy_${overrides.simulatorId}_${overrides.difficulty ?? "beginner"}_${overrides.mode ?? "practice"}`,
    simulatorId: overrides.simulatorId,
    difficulty: overrides.difficulty ?? "beginner",
    mode: overrides.mode ?? "practice",
    dimensionConfig: { direction: { weight: 1 } },
    passingScore: overrides.passingScore ?? 70,
    createdAt: new Date("2025-01-01T00:00:00Z"),
    updatedAt: new Date("2025-01-01T00:00:00Z"),
  });
  if (!r.ok) throw new Error("policy seed failed");
  policyRepo.create(r.value);
}

describe("CheckChallengeModeUnlocked", () => {
  it("unlocks when the student has a graded practice attempt at or above the passing score", async () => {
    const attemptRepo = new InMemorySimulatorAttemptRepository();
    const policyRepo = new InMemoryScorePolicyRepository();
    seedPolicy(policyRepo, { simulatorId: "bid-elevator", passingScore: 70 });
    attemptRepo.seed([
      makeGradedAttempt({ id: "a1", userId: "u1", simulatorId: "bid-elevator", score: 80 }),
    ]);

    const useCase = new CheckChallengeModeUnlocked({ attemptRepo, scorePolicyRepo: policyRepo });
    const r = await useCase.execute({ userId: "u1", simulatorId: "bid-elevator" });

    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.unlocked).toBe(true);
  });

  it("stays locked when the student's best practice score is below the passing threshold", async () => {
    const attemptRepo = new InMemorySimulatorAttemptRepository();
    const policyRepo = new InMemoryScorePolicyRepository();
    seedPolicy(policyRepo, { simulatorId: "bid-elevator", passingScore: 70 });
    attemptRepo.seed([
      makeGradedAttempt({ id: "a1", userId: "u1", simulatorId: "bid-elevator", score: 50 }),
    ]);

    const useCase = new CheckChallengeModeUnlocked({ attemptRepo, scorePolicyRepo: policyRepo });
    const r = await useCase.execute({ userId: "u1", simulatorId: "bid-elevator" });

    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.unlocked).toBe(false);
  });

  it("stays locked when the student has never attempted this simulator", async () => {
    const attemptRepo = new InMemorySimulatorAttemptRepository();
    const policyRepo = new InMemoryScorePolicyRepository();
    seedPolicy(policyRepo, { simulatorId: "bid-elevator", passingScore: 70 });

    const useCase = new CheckChallengeModeUnlocked({ attemptRepo, scorePolicyRepo: policyRepo });
    const r = await useCase.execute({ userId: "u1", simulatorId: "bid-elevator" });

    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.unlocked).toBe(false);
  });

  it("ignores challenge-mode attempts — only practice-mode passes unlock challenge", async () => {
    const attemptRepo = new InMemorySimulatorAttemptRepository();
    const policyRepo = new InMemoryScorePolicyRepository();
    seedPolicy(policyRepo, { simulatorId: "bid-elevator", passingScore: 70 });
    seedPolicy(policyRepo, {
      simulatorId: "bid-elevator",
      mode: "challenge",
      passingScore: 70,
    });
    attemptRepo.seed([
      makeGradedAttempt({
        id: "a1",
        userId: "u1",
        simulatorId: "bid-elevator",
        mode: "challenge",
        score: 90,
      }),
    ]);

    const useCase = new CheckChallengeModeUnlocked({ attemptRepo, scorePolicyRepo: policyRepo });
    const r = await useCase.execute({ userId: "u1", simulatorId: "bid-elevator" });

    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.unlocked).toBe(false);
  });

  it("checks across scenario versions/difficulties, not just the latest attempt", async () => {
    const attemptRepo = new InMemorySimulatorAttemptRepository();
    const policyRepo = new InMemoryScorePolicyRepository();
    seedPolicy(policyRepo, {
      simulatorId: "bid-elevator",
      difficulty: "beginner",
      passingScore: 70,
    });
    seedPolicy(policyRepo, {
      simulatorId: "bid-elevator",
      difficulty: "advanced",
      passingScore: 70,
    });
    attemptRepo.seed([
      makeGradedAttempt({
        id: "a1",
        userId: "u1",
        simulatorId: "bid-elevator",
        difficulty: "advanced",
        score: 40,
      }),
      makeGradedAttempt({
        id: "a2",
        userId: "u1",
        simulatorId: "bid-elevator",
        difficulty: "beginner",
        score: 85,
      }),
    ]);

    const useCase = new CheckChallengeModeUnlocked({ attemptRepo, scorePolicyRepo: policyRepo });
    const r = await useCase.execute({ userId: "u1", simulatorId: "bid-elevator" });

    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.unlocked).toBe(true);
  });

  it("treats a missing ScorePolicy for that difficulty as not-passing, without erroring", async () => {
    const attemptRepo = new InMemorySimulatorAttemptRepository();
    const policyRepo = new InMemoryScorePolicyRepository();
    // No policy seeded at all.
    attemptRepo.seed([
      makeGradedAttempt({ id: "a1", userId: "u1", simulatorId: "bid-elevator", score: 100 }),
    ]);

    const useCase = new CheckChallengeModeUnlocked({ attemptRepo, scorePolicyRepo: policyRepo });
    const r = await useCase.execute({ userId: "u1", simulatorId: "bid-elevator" });

    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.unlocked).toBe(false);
  });
});

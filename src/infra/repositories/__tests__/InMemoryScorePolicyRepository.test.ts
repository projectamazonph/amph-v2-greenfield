/**
 * InMemoryScorePolicyRepository tests.
 *
 * STORY-065: Scoring Engine + Dimensional Policies.
 */

import { describe, it, expect } from "vitest";
import { Result } from "@/domain/shared/Result";
import { InMemoryScorePolicyRepository } from "@/infra/repositories/InMemoryScorePolicyRepository";
import { createScorePolicy } from "@/domain/entities/ScorePolicy";

function makePolicy(overrides?: {
  simulatorId?: "bid-elevator" | "str-triage";
  difficulty?: "beginner" | "advanced";
  mode?: "practice" | "challenge";
  id?: string;
}) {
  const result = createScorePolicy({
    id: overrides?.id ?? "pol_test_01",
    simulatorId: overrides?.simulatorId ?? "bid-elevator",
    difficulty: overrides?.difficulty ?? "beginner",
    mode: overrides?.mode ?? "practice",
    dimensionConfig: {
      direction: { weight: 0.5, passingThreshold: 80 },
      profitability: { weight: 0.5, passingThreshold: 75 },
    },
    passingScore: 70,
  });
  if (!result.ok) throw new Error("Invalid policy fixture");
  return result.value;
}

describe("InMemoryScorePolicyRepository", () => {
  it("create and findBySimulatorAndDifficulty -- happy path", async () => {
    const repo = new InMemoryScorePolicyRepository();
    const policy = makePolicy();

    const createResult = await repo.create(policy);
    expect(createResult.ok).toBe(true);

    const findResult = await repo.findBySimulatorAndDifficulty(
      "bid-elevator",
      "beginner",
      "practice",
    );
    expect(findResult.ok).toBe(true);
    if (!findResult.ok) return;
    expect(findResult.value).not.toBeNull();
    if (!findResult.value) return;
    expect(findResult.value.id).toBe("pol_test_01");
  });

  it("findBySimulatorAndDifficulty returns null when not found", async () => {
    const repo = new InMemoryScorePolicyRepository();
    const result = await repo.findBySimulatorAndDifficulty("str-triage", "advanced", "challenge");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBeNull();
  });

  it("create fails if a policy already exists for the same tuple", async () => {
    const repo = new InMemoryScorePolicyRepository();
    const policy = makePolicy();
    await repo.create(policy);
    const second = await repo.create(policy);
    expect(second.ok).toBe(false);
  });

  it("findBySimulator returns all policies for a simulator", async () => {
    const repo = new InMemoryScorePolicyRepository();
    await repo.create(
      makePolicy({ simulatorId: "bid-elevator", difficulty: "beginner", mode: "practice" }),
    );
    await repo.create(
      makePolicy({ simulatorId: "bid-elevator", difficulty: "advanced", mode: "practice" }),
    );
    await repo.create(
      makePolicy({ simulatorId: "str-triage", difficulty: "beginner", mode: "practice" }),
    );

    const result = await repo.findBySimulator("bid-elevator");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(2);
  });

  it("update succeeds when the policy exists", async () => {
    const repo = new InMemoryScorePolicyRepository();
    const policy = makePolicy({ id: "pol_upd_01" });
    await repo.create(policy);

    const updated = { ...policy, passingScore: 85 };
    const updateResult = await repo.update(updated);
    expect(updateResult.ok).toBe(true);

    const findResult = await repo.findBySimulatorAndDifficulty(
      "bid-elevator",
      "beginner",
      "practice",
    );
    expect(findResult.ok).toBe(true);
    if (!findResult.ok) return;
    expect(findResult.value!.passingScore).toBe(85);
  });

  it("update fails when the policy does not exist", async () => {
    const repo = new InMemoryScorePolicyRepository();
    const result = await repo.update(makePolicy());
    expect(result.ok).toBe(false);
  });
});

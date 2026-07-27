/**
 * Validates every policy that `pnpm db:seed:policies` would write.
 *
 * This test used to keep a copy-pasted mirror of the policy list, which
 * silently drifted out of sync the moment the real policies changed: it kept
 * asserting that a set of policies nobody seeds any more was valid. It now
 * imports the definitions from `scripts/simulator-policies.ts`, the same
 * module the seed script uses, so drift is impossible by construction.
 *
 * STORY-074.
 */

import { describe, expect, it } from "vitest";
import { POLICIES } from "../../../scripts/simulator-policies";
import {
  createScorePolicy,
  isValidPolicy,
  NON_GRADABLE_DIMENSIONS,
} from "@/domain/entities/ScorePolicy";
import type { SimulatorId } from "@/domain/entities/SimulatorScenario";
import type { Difficulty, SimulatorMode } from "@/domain/entities/SimulatorAttempt";

describe("seed-simulator-policies.ts policy definitions", () => {
  it("seeds a non-empty policy set", () => {
    expect(POLICIES.length).toBeGreaterThan(0);
  });

  for (const policy of POLICIES) {
    it(`'${policy.id}': passes createScorePolicy validation`, () => {
      const result = createScorePolicy({
        id: policy.id,
        simulatorId: policy.simulatorId as SimulatorId,
        difficulty: policy.difficulty as Difficulty,
        mode: policy.mode as SimulatorMode,
        dimensionConfig: Object.fromEntries(
          Object.entries(policy.dimensionConfig).map(([dim, weight]) => [dim, { weight }]),
        ),
        passingScore: policy.passingScore,
      });

      // Surface the actual reason rather than a bare "expected true".
      expect(result.ok ? "ok" : JSON.stringify(result.error)).toBe("ok");
      if (result.ok) expect(isValidPolicy(result.value)).toBe(true);
    });
  }

  it("no policy gives weight to a non-gradable dimension", () => {
    const offenders = POLICIES.flatMap((p) =>
      Object.keys(p.dimensionConfig)
        .filter((d) => NON_GRADABLE_DIMENSIONS.includes(d))
        .map((d) => `${p.id}:${d}`),
    );
    expect(offenders).toEqual([]);
  });

  it("every policy is reachable, i.e. a flawless attempt can score 100", () => {
    // Regression guard for two mirror-image defects. Weights summing below
    // 1.0 caps a perfect learner (the 0.90 bug). Weighting a dimension the
    // simulator can never earn does the same thing from the other direction.
    for (const p of POLICIES) {
      const total = Object.values(p.dimensionConfig).reduce((a, b) => a + b, 0);
      expect(`${p.id}=${total.toFixed(2)}`).toBe(`${p.id}=1.00`);
      expect(100).toBeGreaterThanOrEqual(p.passingScore);
    }
  });
});

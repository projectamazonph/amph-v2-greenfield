/**
 * IScorePolicyRepository — port for persisting and retrieving ScorePolicy entities.
 *
 * STORY-065: Scoring Engine + Dimensional Policies.
 */

import type { SimulatorId } from "@/domain/entities/SimulatorScenario";
import type { ScorePolicy } from "@/domain/entities/ScorePolicy";
import type { Difficulty, SimulatorMode } from "@/domain/entities/SimulatorAttempt";
import type { SimulatorAttemptError } from "@/domain/entities/SimulatorAttempt";
import { Result } from "@/domain/shared/Result";

export interface IScorePolicyRepository {
  /**
   * Find the policy exactly matching the (simulatorId, difficulty, mode) tuple.
   * Returns null if none exists.
   */
  findBySimulatorAndDifficulty(
    simulatorId: SimulatorId,
    difficulty: Difficulty,
    mode: SimulatorMode,
  ): Promise<Result<ScorePolicy | null, SimulatorAttemptError>>;

  /**
   * Find all policies for a given simulator (all difficulty/mode combinations).
   */
  findBySimulator(
    simulatorId: SimulatorId,
  ): Promise<Result<readonly ScorePolicy[], SimulatorAttemptError>>;

  /**
   * Persist a new ScorePolicy. Fails if a policy already exists for the same tuple.
   */
  create(policy: ScorePolicy): Promise<Result<void, SimulatorAttemptError>>;

  /**
   * Update an existing ScorePolicy.
   */
  update(policy: ScorePolicy): Promise<Result<void, SimulatorAttemptError>>;
}

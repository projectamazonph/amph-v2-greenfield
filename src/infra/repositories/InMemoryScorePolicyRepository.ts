/**
 * InMemoryScorePolicyRepository — in-memory implementation for testing and dev.
 *
 * STORY-065: Scoring Engine + Dimensional Policies.
 */

import type { SimulatorId } from "@/domain/entities/SimulatorScenario";
import type { ScorePolicy } from "@/domain/entities/ScorePolicy";
import type { Difficulty, SimulatorMode } from "@/domain/entities/SimulatorAttempt";
import type { SimulatorAttemptError } from "@/domain/entities/SimulatorAttempt";
import type { IScorePolicyRepository } from "@/ports/repositories/IScorePolicyRepository";
import { Result } from "@/domain/shared/Result";

export class InMemoryScorePolicyRepository implements IScorePolicyRepository {
  private readonly store = new Map<string, ScorePolicy>();

  private key(simulatorId: SimulatorId, difficulty: Difficulty, mode: SimulatorMode): string {
    return `${simulatorId}::${difficulty}::${mode}`;
  }

  async findBySimulatorAndDifficulty(
    simulatorId: SimulatorId,
    difficulty: Difficulty,
    mode: SimulatorMode,
  ): Promise<Result<ScorePolicy | null, SimulatorAttemptError>> {
    const found = this.store.get(this.key(simulatorId, difficulty, mode)) ?? null;
    return Result.ok(found);
  }

  async findBySimulator(
    simulatorId: SimulatorId,
  ): Promise<Result<readonly ScorePolicy[], SimulatorAttemptError>> {
    const results = [...this.store.values()].filter((p) => p.simulatorId === simulatorId);
    return Result.ok(results);
  }

  async create(policy: ScorePolicy): Promise<Result<void, SimulatorAttemptError>> {
    const k = this.key(policy.simulatorId, policy.difficulty, policy.mode);
    if (this.store.has(k)) {
      return Result.err({ kind: "db_error", message: `Policy already exists for ${k}` });
    }
    this.store.set(k, { ...policy });
    return Result.ok(undefined);
  }

  async update(policy: ScorePolicy): Promise<Result<void, SimulatorAttemptError>> {
    const k = this.key(policy.simulatorId, policy.difficulty, policy.mode);
    if (!this.store.has(k)) {
      return Result.err({ kind: "db_error", message: `Policy not found for ${k}` });
    }
    this.store.set(k, { ...policy });
    return Result.ok(undefined);
  }
}

/**
 * GetBestSimgridScore — read the highest-score attempt for a
 * (user, simulator) pair. Used by the dashboard progress card.
 *
 * ADR-026: SimGrid integration.
 */

import { Result } from "@/domain/shared/Result";
import type { SimgridAttempt, SimgridSimulatorId } from "@/domain/simgrid";
import type {
  ISimgridAttemptRepository,
  SimgridAttemptRepositoryError,
} from "@/ports/simgrid/ISimgridAttemptRepository";

export interface GetBestSimgridScoreInput {
  userId: string;
  simulatorId: SimgridSimulatorId;
}

export interface GetBestSimgridScoreDeps {
  simgridAttemptRepo: ISimgridAttemptRepository;
}

export class GetBestSimgridScore {
  constructor(private readonly deps: GetBestSimgridScoreDeps) {}

  async execute(
    input: GetBestSimgridScoreInput,
  ): Promise<Result<SimgridAttempt | null, SimgridAttemptRepositoryError>> {
    if (!input.userId) {
      return Result.err({ kind: "infrastructure", message: "userId required" });
    }
    return this.deps.simgridAttemptRepo.getBestForUserAndSimulator(input.userId, input.simulatorId);
  }
}

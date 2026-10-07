import type { Result } from "@/domain/shared/Result";
import type { SimgridAttempt, SimgridSimulatorId } from "@/domain/simgrid";

/**
 * ISimgridAttemptRepository — port for persisting SimGrid bridge attempts.
 *
 * ADR-014: every port method returns Result<T, E>.
 * ADR-026: SimGrid integration.
 */
export type SimgridAttemptRepositoryError =
  | { kind: "not_found" }
  | { kind: "conflict"; message: string }
  | { kind: "infrastructure"; message: string };

export interface ISimgridAttemptRepository {
  record(attempt: SimgridAttempt): Promise<Result<void, SimgridAttemptRepositoryError>>;

  listForUser(
    userId: string,
  ): Promise<Result<readonly SimgridAttempt[], SimgridAttemptRepositoryError>>;

  getBestForUserAndSimulator(
    userId: string,
    simulatorId: SimgridSimulatorId,
  ): Promise<Result<SimgridAttempt | null, SimgridAttemptRepositoryError>>;
}

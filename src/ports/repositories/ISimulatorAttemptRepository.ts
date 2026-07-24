/**
 * ISimulatorAttemptRepository — port for persisting simulator attempts and decisions.
 *
 * STORY-064: Simulator Attempt Infrastructure.
 *
 * ADR-014: every port method returns Result<T, E>.
 */

import type { Result } from "@/domain/shared/Result";
import type {
  SimulatorAttempt,
  AttemptStatus,
  ScoreDimensions,
  SimulatorAttemptError,
} from "@/domain/entities/SimulatorAttempt";
import type { SimulatorDecision } from "@/domain/entities/SimulatorDecision";
import type { SimulatorId } from "@/domain/entities/SimulatorScenario";

// Re-export so callers can import from one place
export type { SimulatorAttemptError } from "@/domain/entities/SimulatorAttempt";

export interface ISimulatorAttemptRepository {
  /**
   * Persist a new attempt. Called once at the start of a session.
   * Returns the created attempt on success.
   */
  create(attempt: SimulatorAttempt): Promise<Result<SimulatorAttempt, SimulatorAttemptError>>;

  /**
   * Find an attempt by its internal id (cuid). Used by the webhook and scoring service.
   */
  findById(id: string): Promise<Result<SimulatorAttempt | null, SimulatorAttemptError>>;

  /**
   * Find an attempt by its human-readable attemptId (e.g. "ATT-ABC1234").
   */
  findByAttemptId(
    attemptId: string,
  ): Promise<Result<SimulatorAttempt | null, SimulatorAttemptError>>;

  /**
   * List attempts for a user + scenario combination.
   * Use `onlyInProgress` to check for active attempts before starting a new one.
   */
  findByUserAndScenario(
    userId: string,
    simulatorId: SimulatorId,
    scenarioId: string,
    options?: { onlyInProgress?: boolean },
  ): Promise<Result<SimulatorAttempt[], SimulatorAttemptError>>;

  /**
   * Append a decision to an existing attempt.
   * Returns an error if the attempt is not in_progress.
   */
  addDecision(
    attemptId: string,
    decision: SimulatorDecision,
  ): Promise<Result<void, SimulatorAttemptError>>;

  /**
   * Update the status of an attempt, optionally with a score and dimensions.
   * Used for submitAttempt, gradeAttempt transitions.
   */
  updateStatus(
    id: string,
    status: AttemptStatus,
    options?: { score?: number; scoreDimensions?: ScoreDimensions },
  ): Promise<Result<SimulatorAttempt, SimulatorAttemptError>>;
}

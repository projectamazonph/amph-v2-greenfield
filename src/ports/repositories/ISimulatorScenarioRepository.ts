/**
 * ISimulatorScenarioRepository — port for persisting simulator scenarios.
 *
 * STORY-050b. Stores the admin-defined scenario templates separate from
 * the runtime SimulatorRegistry (which holds the executable Simulator<>
 * instances). Scenarios are immutable once created; updates store a
 * frozen copy.
 *
 * ADR-014: every port method returns Result<T, E>.
 */

import type { Result } from "@/domain/shared/Result";
import type { SimulatorScenario } from "@/domain/entities/SimulatorScenario";
import type { SimulatorId } from "@/domain/entities/SimulatorScenario";

export type SimulatorScenarioError =
  | { kind: "not_found" }
  | { kind: "db_error"; message: string }
  | { kind: "invalid_simulator_id" }
  | { kind: "invalid_difficulty" };

export interface ListScenariosFilter {
  simulatorId?: SimulatorId;
}

export interface ISimulatorScenarioRepository {
  /**
   * List all scenarios, optionally filtered by simulatorId.
   * Returns an empty array (not an error) when no matches.
   */
  listAll(
    filter?: ListScenariosFilter,
  ): Promise<Result<SimulatorScenario[], SimulatorScenarioError>>;

  /**
   * Find a scenario by its id, regardless of status (draft/published/
   * archived). Returns null (not an error) if not found. Unlike listAll,
   * this does not filter archived rows — an admin navigating to a
   * specific version by id (via version history) should always resolve it.
   */
  findById(id: string): Promise<Result<SimulatorScenario | null, SimulatorScenarioError>>;

  /**
   * Find the currently published scenario for a simulator. Returns null
   * (not an error) if none is published yet. STORY-085.
   */
  findPublished(
    simulatorId: SimulatorId,
  ): Promise<Result<SimulatorScenario | null, SimulatorScenarioError>>;

  /**
   * List every version (draft/published/archived) sharing a scenarioKey,
   * newest first. STORY-085.
   */
  listVersions(scenarioKey: string): Promise<Result<SimulatorScenario[], SimulatorScenarioError>>;

  /**
   * Publish a draft scenario: atomically archives any currently-published
   * scenario sharing the same scenarioKey, then marks this one published.
   * Returns not_found if the scenario doesn't exist. STORY-085.
   */
  publish(id: string): Promise<Result<SimulatorScenario, SimulatorScenarioError>>;

  /**
   * Persist a new scenario. The entity factory (createSimulatorScenario)
   * validates simulatorId + difficulty before this is called.
   * Returns the created scenario on success.
   */
  create(scenario: SimulatorScenario): Promise<Result<SimulatorScenario, SimulatorScenarioError>>;

  /**
   * Update a scenario. The entity factory (createSimulatorScenario)
   * validates fields. Returns the updated scenario on success.
   * Returns not_found if the scenario doesn't exist.
   */
  update(scenario: SimulatorScenario): Promise<Result<SimulatorScenario, SimulatorScenarioError>>;

  /**
   * Archive (soft-delete) a scenario by id.
   * Returns not_found if the scenario doesn't exist.
   */
  archive(id: string): Promise<Result<void, SimulatorScenarioError>>;
}

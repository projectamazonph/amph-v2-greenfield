/**
 * InMemorySimulatorScenarioRepository — fast in-memory adapter.
 *
 * STORY-050b. Used in tests and in prod (the prod container falls back
 * to in-memory for simulator scenarios since there's no Prisma table yet).
 */

import { Result } from "@/domain/shared/Result";
import type {
  SimulatorScenario,
  SimulatorId,
} from "@/domain/entities/SimulatorScenario";
import type {
  ISimulatorScenarioRepository,
  SimulatorScenarioError,
  ListScenariosFilter,
} from "@/ports/repositories/ISimulatorScenarioRepository";

export class InMemorySimulatorScenarioRepository
  implements ISimulatorScenarioRepository
{
  private scenarios = new Map<string, SimulatorScenario>();
  private archived = new Set<string>();

  async listAll(
    filter?: ListScenariosFilter,
  ): Promise<Result<SimulatorScenario[], SimulatorScenarioError>> {
    let list = [...this.scenarios.values()].filter(
      (s) => !this.archived.has(s.id),
    );
    if (filter?.simulatorId) {
      list = list.filter((s) => s.simulatorId === filter.simulatorId);
    }
    return Result.ok(list);
  }

  async findById(
    id: string,
  ): Promise<Result<SimulatorScenario | null, SimulatorScenarioError>> {
    const s = this.scenarios.get(id);
    if (!s || this.archived.has(id)) {
      return Result.ok(null);
    }
    return Result.ok(s);
  }

  async create(
    scenario: SimulatorScenario,
  ): Promise<Result<SimulatorScenario, SimulatorScenarioError>> {
    if (this.scenarios.has(scenario.id)) {
      return Result.err({
        kind: "db_error",
        message: `Scenario with id ${scenario.id} already exists`,
      });
    }
    this.scenarios.set(scenario.id, scenario);
    return Result.ok(scenario);
  }

  async update(
    scenario: SimulatorScenario,
  ): Promise<Result<SimulatorScenario, SimulatorScenarioError>> {
    if (!this.scenarios.has(scenario.id) || this.archived.has(scenario.id)) {
      return Result.err({ kind: "not_found" });
    }
    this.scenarios.set(scenario.id, scenario);
    return Result.ok(scenario);
  }

  async archive(id: string): Promise<Result<void, SimulatorScenarioError>> {
    if (!this.scenarios.has(id) || this.archived.has(id)) {
      return Result.err({ kind: "not_found" });
    }
    this.archived.add(id);
    return Result.ok(undefined);
  }

  /** Test helper. */
  seed(scenario: SimulatorScenario): void {
    this.scenarios.set(scenario.id, scenario);
  }

  /** Test helper. */
  clear(): void {
    this.scenarios.clear();
    this.archived.clear();
  }
}

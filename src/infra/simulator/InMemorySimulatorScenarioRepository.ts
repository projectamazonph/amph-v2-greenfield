/**
 * InMemorySimulatorScenarioRepository — fast in-memory adapter.
 *
 * STORY-050b. Used in tests and in prod (the prod container falls back
 * to in-memory for simulator scenarios since there's no Prisma table yet).
 *
 * STORY-085: publishing + versioning. `archived` (a Set of ids) still
 * gates `listAll`, but is now driven by `status === "archived"` rather
 * than a separate soft-delete flag, matching the Prisma adapter.
 */

import { Result } from "@/domain/shared/Result";
import type { SimulatorScenario, SimulatorId } from "@/domain/entities/SimulatorScenario";
import type {
  ISimulatorScenarioRepository,
  SimulatorScenarioError,
  ListScenariosFilter,
} from "@/ports/repositories/ISimulatorScenarioRepository";

export class InMemorySimulatorScenarioRepository implements ISimulatorScenarioRepository {
  private scenarios = new Map<string, SimulatorScenario>();

  async listAll(
    filter?: ListScenariosFilter,
  ): Promise<Result<SimulatorScenario[], SimulatorScenarioError>> {
    let list = [...this.scenarios.values()].filter((s) => s.status !== "archived");
    if (filter?.simulatorId) {
      list = list.filter((s) => s.simulatorId === filter.simulatorId);
    }
    return Result.ok(list);
  }

  async findById(id: string): Promise<Result<SimulatorScenario | null, SimulatorScenarioError>> {
    return Result.ok(this.scenarios.get(id) ?? null);
  }

  async findPublished(
    simulatorId: SimulatorId,
  ): Promise<Result<SimulatorScenario | null, SimulatorScenarioError>> {
    const found = [...this.scenarios.values()].find(
      (s) => s.simulatorId === simulatorId && s.status === "published",
    );
    return Result.ok(found ?? null);
  }

  async listVersions(
    scenarioKey: string,
  ): Promise<Result<SimulatorScenario[], SimulatorScenarioError>> {
    const versions = [...this.scenarios.values()]
      .filter((s) => s.scenarioKey === scenarioKey)
      .sort((a, b) => b.version - a.version);
    return Result.ok(versions);
  }

  async publish(id: string): Promise<Result<SimulatorScenario, SimulatorScenarioError>> {
    const target = this.scenarios.get(id);
    if (!target) {
      return Result.err({ kind: "not_found" });
    }
    const now = new Date();
    for (const s of this.scenarios.values()) {
      if (s.scenarioKey === target.scenarioKey && s.status === "published" && s.id !== id) {
        this.scenarios.set(s.id, { ...s, status: "archived", updatedAt: now });
      }
    }
    const published: SimulatorScenario = { ...target, status: "published", updatedAt: now };
    this.scenarios.set(id, published);
    return Result.ok(published);
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
    if (!this.scenarios.has(scenario.id)) {
      return Result.err({ kind: "not_found" });
    }
    this.scenarios.set(scenario.id, scenario);
    return Result.ok(scenario);
  }

  async archive(id: string): Promise<Result<void, SimulatorScenarioError>> {
    const s = this.scenarios.get(id);
    if (!s || s.status === "archived") {
      return Result.err({ kind: "not_found" });
    }
    this.scenarios.set(id, { ...s, status: "archived", updatedAt: new Date() });
    return Result.ok(undefined);
  }

  /** Test helper. */
  seed(scenario: SimulatorScenario): void {
    this.scenarios.set(scenario.id, scenario);
  }

  /** Test helper. */
  clear(): void {
    this.scenarios.clear();
  }
}

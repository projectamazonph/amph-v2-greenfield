/**
 * GetSimulatorScenario — get a single simulator scenario by id.
 *
 * STORY-050b. Used by the admin scenario edit page.
 */

import { Result } from "@/domain/shared/Result";
import type { SimulatorScenario } from "@/domain/entities/SimulatorScenario";
import type {
  ISimulatorScenarioRepository,
  SimulatorScenarioError,
} from "@/ports/repositories/ISimulatorScenarioRepository";

export type GetSimulatorScenarioError =
  | { kind: "scenario_not_found" }
  | { kind: "db_error"; message: string };

export type GetSimulatorScenarioResult = Result<
  { scenario: SimulatorScenario },
  GetSimulatorScenarioError
>;

export interface GetSimulatorScenarioDeps {
  scenarioRepo: ISimulatorScenarioRepository;
}

export class GetSimulatorScenario {
  constructor(private readonly deps: GetSimulatorScenarioDeps) {}

  async execute(id: string): Promise<GetSimulatorScenarioResult> {
    const result = await this.deps.scenarioRepo.findById(id);
    if (!result.ok) {
      return Result.err({
        kind: "db_error",
        message: result.error.kind === "db_error" ? result.error.message : "Failed to fetch scenario",
      });
    }
    if (result.value === null) {
      return Result.err({ kind: "scenario_not_found" });
    }
    return Result.ok({ scenario: result.value });
  }
}

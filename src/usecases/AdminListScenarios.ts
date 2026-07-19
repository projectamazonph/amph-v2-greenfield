/**
 * AdminListScenarios — list all simulator scenarios for the admin panel.
 *
 * STORY-050b.
 *
 * Returns all non-archived scenarios, optionally filtered by simulatorId.
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

export interface AdminListScenariosInput {
  simulatorId?: SimulatorId;
}

export type AdminListScenariosError =
  | { kind: "db_error"; message: string }
  | SimulatorScenarioError;

export type AdminListScenariosResult = Result<
  { scenarios: SimulatorScenario[] },
  AdminListScenariosError
>;

export interface AdminListScenariosDeps {
  scenarioRepo: ISimulatorScenarioRepository;
}

export class AdminListScenarios {
  constructor(private readonly deps: AdminListScenariosDeps) {}

  async execute(
    input: AdminListScenariosInput = {},
  ): Promise<AdminListScenariosResult> {
    const filter: ListScenariosFilter = {};
    if (input.simulatorId) {
      filter.simulatorId = input.simulatorId;
    }

    const result = await this.deps.scenarioRepo.listAll(filter);
    if (!result.ok) {
      if (result.error.kind === "db_error") {
        return Result.err(result.error);
      }
      return Result.err({
        kind: "db_error",
        message: "Failed to list scenarios",
      });
    }
    return Result.ok({ scenarios: result.value });
  }
}

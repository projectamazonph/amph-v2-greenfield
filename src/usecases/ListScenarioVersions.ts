/**
 * ListScenarioVersions — thin wrapper over
 * scenarioRepo.listVersions(scenarioKey) for the admin version-history view.
 *
 * STORY-085.
 */

import { Result } from "@/domain/shared/Result";
import type { SimulatorScenario } from "@/domain/entities/SimulatorScenario";
import type {
  ISimulatorScenarioRepository,
  SimulatorScenarioError,
} from "@/ports/repositories/ISimulatorScenarioRepository";

export interface ListScenarioVersionsInput {
  scenarioKey: string;
}

export type ListScenarioVersionsResult = Result<
  { versions: SimulatorScenario[] },
  SimulatorScenarioError
>;

export interface ListScenarioVersionsDeps {
  scenarioRepo: ISimulatorScenarioRepository;
}

export class ListScenarioVersions {
  constructor(private readonly deps: ListScenarioVersionsDeps) {}

  async execute(input: ListScenarioVersionsInput): Promise<ListScenarioVersionsResult> {
    const result = await this.deps.scenarioRepo.listVersions(input.scenarioKey);
    if (!result.ok) {
      return Result.err(result.error);
    }
    return Result.ok({ versions: result.value });
  }
}

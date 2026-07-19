/**
 * PrismaSimulatorScenarioRepository — production Prisma adapter.
 *
 * STORY-050b. STUB: throws on every method.
 *
 * The Prisma SimulatorScenario table doesn't exist yet. When the schema
 * migration lands, this stub gets a real implementation.
 * Until then, the prod container falls back to InMemorySimulatorScenarioRepository.
 */

import type { Result } from "@/domain/shared/Result";
import type { SimulatorScenario } from "@/domain/entities/SimulatorScenario";
import type {
  ISimulatorScenarioRepository,
  SimulatorScenarioError,
  ListScenariosFilter,
} from "@/ports/repositories/ISimulatorScenarioRepository";

function notImplemented(): never {
  throw new Error(
    "PrismaSimulatorScenarioRepository is not implemented yet. " +
      "The Prisma SimulatorScenario schema migration is a follow-up. " +
      "The prod container falls back to InMemorySimulatorScenarioRepository.",
  );
}

export class PrismaSimulatorScenarioRepository
  implements ISimulatorScenarioRepository
{
  async listAll(
    _filter?: ListScenariosFilter,
  ): Promise<Result<SimulatorScenario[], SimulatorScenarioError>> {
    notImplemented();
  }

  async findById(
    _id: string,
  ): Promise<Result<SimulatorScenario | null, SimulatorScenarioError>> {
    notImplemented();
  }

  async create(
    _scenario: SimulatorScenario,
  ): Promise<Result<SimulatorScenario, SimulatorScenarioError>> {
    notImplemented();
  }

  async update(
    _scenario: SimulatorScenario,
  ): Promise<Result<SimulatorScenario, SimulatorScenarioError>> {
    notImplemented();
  }

  async archive(_id: string): Promise<Result<void, SimulatorScenarioError>> {
    notImplemented();
  }
}

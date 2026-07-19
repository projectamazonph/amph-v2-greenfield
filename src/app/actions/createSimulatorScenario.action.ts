/**
 * createSimulatorScenarioAction — admin server action to create a simulator scenario.
 *
 * STORY-050b. Thin wrapper around CreateSimulatorScenario.execute.
 */

"use server";

import { Result } from "@/domain/shared/Result";
import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import type {
  CreateSimulatorScenario,
  CreateSimulatorScenarioInput,
  CreateSimulatorScenarioError,
} from "@/usecases/CreateSimulatorScenario";
import type { UserRepository } from "@/ports/repositories/UserRepository";

/** Input type the page/form provides — no actorId (the action injects it from the session). */
export type CreateSimulatorScenarioPageInput = Omit<
  CreateSimulatorScenarioInput,
  "actorId"
>;

export type CreateSimulatorScenarioActionResult = Result<
  { scenarioId: string },
  CreateSimulatorScenarioError | { kind: "unauthorized" }
>;

async function defaultGetCurrentAdminId(
  container: { userRepo: UserRepository },
): Promise<string | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const userResult = await container.userRepo.findById(userId);
  if (!userResult.ok) return null;
  if (userResult.value.role !== "ADMIN") return null;
  return userId;
}

export async function performCreateSimulatorScenario(
  container: { userRepo: UserRepository; createSimulatorScenario: CreateSimulatorScenario },
  input: CreateSimulatorScenarioPageInput,
  getCurrentAdminId: (
    container: { userRepo: UserRepository },
  ) => Promise<string | null>,
): Promise<CreateSimulatorScenarioActionResult> {
  const adminId = await getCurrentAdminId(container);
  if (!adminId) {
    return Result.err({ kind: "unauthorized" });
  }

  const result = await container.createSimulatorScenario.execute({
    ...input,
    actorId: adminId,
  });
  if (!result.ok) {
    return Result.err(result.error);
  }
  return Result.ok({ scenarioId: result.value.scenario.id });
}

export async function createSimulatorScenarioAction(
  input: CreateSimulatorScenarioPageInput,
): Promise<CreateSimulatorScenarioActionResult> {
  const container = buildContainer();
  return performCreateSimulatorScenario(
    container,
    input,
    defaultGetCurrentAdminId,
  );
}

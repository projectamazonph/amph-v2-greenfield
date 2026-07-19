/**
 * updateSimulatorScenarioAction — admin server action to update a simulator scenario.
 *
 * STORY-050b. Thin wrapper around UpdateSimulatorScenario.execute.
 */

"use server";

import { Result } from "@/domain/shared/Result";
import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import type {
  UpdateSimulatorScenario,
  UpdateSimulatorScenarioInput,
  UpdateSimulatorScenarioError,
} from "@/usecases/UpdateSimulatorScenario";
import type { UserRepository } from "@/ports/repositories/UserRepository";

/** Input type the page/form provides — no actorId (the action injects it from the session). */
export type UpdateSimulatorScenarioPageInput = Omit<
  UpdateSimulatorScenarioInput,
  "actorId"
>;

export type UpdateSimulatorScenarioActionResult = Result<
  { scenarioId: string },
  UpdateSimulatorScenarioError | { kind: "unauthorized" }
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

export async function performUpdateSimulatorScenario(
  container: {
    userRepo: UserRepository;
    updateSimulatorScenario: UpdateSimulatorScenario;
  },
  input: UpdateSimulatorScenarioPageInput,
  getCurrentAdminId: (
    container: { userRepo: UserRepository },
  ) => Promise<string | null>,
): Promise<UpdateSimulatorScenarioActionResult> {
  const adminId = await getCurrentAdminId(container);
  if (!adminId) {
    return Result.err({ kind: "unauthorized" });
  }

  const result = await container.updateSimulatorScenario.execute({
    ...input,
    actorId: adminId,
  });
  if (!result.ok) {
    return Result.err(result.error);
  }
  return Result.ok({ scenarioId: result.value.scenario.id });
}

export async function updateSimulatorScenarioAction(
  input: UpdateSimulatorScenarioPageInput,
): Promise<UpdateSimulatorScenarioActionResult> {
  const container = buildContainer();
  return performUpdateSimulatorScenario(
    container,
    input,
    defaultGetCurrentAdminId,
  );
}

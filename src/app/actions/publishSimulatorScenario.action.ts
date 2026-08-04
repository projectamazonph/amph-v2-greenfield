/**
 * publishSimulatorScenarioAction — admin server action to publish a draft scenario.
 *
 * STORY-085. Thin wrapper around PublishSimulatorScenario.execute.
 */

"use server";

import { Result } from "@/domain/shared/Result";
import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import type {
  PublishSimulatorScenario,
  PublishSimulatorScenarioError,
} from "@/usecases/PublishSimulatorScenario";
import type { UserRepository } from "@/ports/repositories/UserRepository";

export type PublishSimulatorScenarioActionResult = Result<
  { scenarioId: string },
  PublishSimulatorScenarioError | { kind: "unauthorized" }
>;

async function defaultGetCurrentAdminId(container: {
  userRepo: UserRepository;
}): Promise<string | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const userResult = await container.userRepo.findById(userId);
  if (!userResult.ok) return null;
  if (userResult.value.role !== "ADMIN") return null;
  return userId;
}

export async function performPublishSimulatorScenario(
  container: {
    userRepo: UserRepository;
    publishSimulatorScenario: PublishSimulatorScenario;
  },
  input: { id: string },
  getCurrentAdminId: (container: { userRepo: UserRepository }) => Promise<string | null>,
): Promise<PublishSimulatorScenarioActionResult> {
  const adminId = await getCurrentAdminId(container);
  if (!adminId) {
    return Result.err({ kind: "unauthorized" });
  }

  const result = await container.publishSimulatorScenario.execute({
    id: input.id,
    actorId: adminId,
  });
  if (!result.ok) {
    return Result.err(result.error);
  }
  return Result.ok({ scenarioId: result.value.scenario.id });
}

export async function publishSimulatorScenarioAction(input: {
  id: string;
}): Promise<PublishSimulatorScenarioActionResult> {
  const container = buildContainer();
  return performPublishSimulatorScenario(container, input, defaultGetCurrentAdminId);
}

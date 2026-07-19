/**
 * archiveSimulatorScenarioAction — admin server action to archive a simulator scenario.
 *
 * STORY-050b. Thin wrapper around ArchiveSimulatorScenario.execute.
 */

"use server";

import { Result } from "@/domain/shared/Result";
import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import type {
  ArchiveSimulatorScenario,
  ArchiveSimulatorScenarioError,
} from "@/usecases/ArchiveSimulatorScenario";
import type { UserRepository } from "@/ports/repositories/UserRepository";

export type ArchiveSimulatorScenarioActionResult = Result<
  { scenarioId: string },
  ArchiveSimulatorScenarioError | { kind: "unauthorized" }
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

export async function performArchiveSimulatorScenario(
  container: {
    userRepo: UserRepository;
    archiveSimulatorScenario: ArchiveSimulatorScenario;
  },
  input: { id: string },
  getCurrentAdminId: (
    container: { userRepo: UserRepository },
  ) => Promise<string | null>,
): Promise<ArchiveSimulatorScenarioActionResult> {
  const adminId = await getCurrentAdminId(container);
  if (!adminId) {
    return Result.err({ kind: "unauthorized" });
  }

  const result = await container.archiveSimulatorScenario.execute({
    id: input.id,
    actorId: adminId,
  });
  if (!result.ok) {
    return Result.err(result.error);
  }
  return Result.ok({ scenarioId: input.id });
}

export async function archiveSimulatorScenarioAction(
  input: { id: string },
): Promise<ArchiveSimulatorScenarioActionResult> {
  const container = buildContainer();
  return performArchiveSimulatorScenario(
    container,
    input,
    defaultGetCurrentAdminId,
  );
}

/**
 * createScenarioVersionDraftAction — admin server action to derive a new
 * draft version from an existing scenario.
 *
 * STORY-085. Thin wrapper around CreateScenarioVersionDraft.execute.
 */

"use server";

import { Result } from "@/domain/shared/Result";
import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import type {
  CreateScenarioVersionDraft,
  CreateScenarioVersionDraftError,
} from "@/usecases/CreateScenarioVersionDraft";
import type { UserRepository } from "@/ports/repositories/UserRepository";

export type CreateScenarioVersionDraftActionResult = Result<
  { scenarioId: string },
  CreateScenarioVersionDraftError | { kind: "unauthorized" }
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

export async function performCreateScenarioVersionDraft(
  container: {
    userRepo: UserRepository;
    createScenarioVersionDraft: CreateScenarioVersionDraft;
  },
  input: { sourceId: string },
  getCurrentAdminId: (container: { userRepo: UserRepository }) => Promise<string | null>,
): Promise<CreateScenarioVersionDraftActionResult> {
  const adminId = await getCurrentAdminId(container);
  if (!adminId) {
    return Result.err({ kind: "unauthorized" });
  }

  const result = await container.createScenarioVersionDraft.execute({
    sourceId: input.sourceId,
    actorId: adminId,
  });
  if (!result.ok) {
    return Result.err(result.error);
  }
  return Result.ok({ scenarioId: result.value.scenario.id });
}

export async function createScenarioVersionDraftAction(input: {
  sourceId: string;
}): Promise<CreateScenarioVersionDraftActionResult> {
  const container = buildContainer();
  return performCreateScenarioVersionDraft(container, input, defaultGetCurrentAdminId);
}

/**
 * updateModuleAction — admin server action to update a module.
 *
 * STORY-048b.
 */

"use server";

import { Result } from "@/domain/shared/Result";
import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import type { UpdateModule, UpdateModuleInput, UpdateModuleError } from "@/usecases/UpdateModule";
import type { UserRepository } from "@/ports/repositories/UserRepository";

export type UpdateModulePageInput = Omit<UpdateModuleInput, "actorId">;

export type UpdateModuleActionResult = Result<
  { moduleId: string },
  UpdateModuleError | { kind: "unauthorized" }
>;

export async function performUpdateModule(
  container: { userRepo: UserRepository; updateModule: UpdateModule },
  input: UpdateModulePageInput,
  getCurrentAdminId: (container: { userRepo: UserRepository }) => Promise<string | null>,
): Promise<UpdateModuleActionResult> {
  const adminId = await getCurrentAdminId(container);
  if (!adminId) {
    return Result.err({ kind: "unauthorized" });
  }

  const result = await container.updateModule.execute({ ...input, actorId: adminId });
  if (!result.ok) {
    return Result.err(result.error);
  }
  return Result.ok({ moduleId: result.value.module.id });
}

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

export async function updateModuleAction(
  input: UpdateModulePageInput,
): Promise<UpdateModuleActionResult> {
  const container = buildContainer();
  return performUpdateModule(container, input, defaultGetCurrentAdminId);
}

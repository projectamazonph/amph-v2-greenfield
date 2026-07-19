/**
 * deleteModuleAction — admin server action to delete a module.
 *
 * STORY-048b.
 */

"use server";

import { Result } from "@/domain/shared/Result";
import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import type { DeleteModule, DeleteModuleInput, DeleteModuleError } from "@/usecases/DeleteModule";
import type { UserRepository } from "@/ports/repositories/UserRepository";

export type DeleteModuleActionResult = Result<
  { deleted: true },
  DeleteModuleError | { kind: "unauthorized" }
>;

export async function performDeleteModule(
  container: { userRepo: UserRepository; deleteModule: DeleteModule },
  input: DeleteModuleInput,
  getCurrentAdminId: (
    container: { userRepo: UserRepository },
  ) => Promise<string | null>,
): Promise<DeleteModuleActionResult> {
  const adminId = await getCurrentAdminId(container);
  if (!adminId) {
    return Result.err({ kind: "unauthorized" });
  }

  const result = await container.deleteModule.execute(input);
  if (!result.ok) {
    return Result.err(result.error);
  }
  return Result.ok({ deleted: true });
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

export async function deleteModuleAction(
  input: DeleteModuleInput,
): Promise<DeleteModuleActionResult> {
  const container = buildContainer();
  return performDeleteModule(container, input, defaultGetCurrentAdminId);
}

/**
 * reorderModulesAction — admin server action to atomically reorder a course's modules.
 *
 * STORY-048b.
 */

"use server";

import { Result } from "@/domain/shared/Result";
import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import type { ReorderModules, ReorderModulesInput } from "@/usecases/ReorderModules";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import type { ModuleError } from "@/ports/repositories/IModuleRepository";

export type ReorderModulesActionResult = Result<
  { modules: readonly { id: string }[] },
  ModuleError | { kind: "unauthorized" }
>;

export async function performReorderModules(
  container: { userRepo: UserRepository; reorderModules: ReorderModules },
  input: ReorderModulesInput,
  getCurrentAdminId: (
    container: { userRepo: UserRepository },
  ) => Promise<string | null>,
): Promise<ReorderModulesActionResult> {
  const adminId = await getCurrentAdminId(container);
  if (!adminId) {
    return Result.err({ kind: "unauthorized" });
  }

  const result = await container.reorderModules.execute(input);
  if (!result.ok) {
    return Result.err(result.error);
  }
  return Result.ok({ modules: result.value.modules.map((m) => ({ id: m.id })) });
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

export async function reorderModulesAction(
  input: ReorderModulesInput,
): Promise<ReorderModulesActionResult> {
  const container = buildContainer();
  return performReorderModules(container, input, defaultGetCurrentAdminId);
}

/**
 * createModuleAction — admin server action to create a new module.
 *
 * STORY-048b.
 */

"use server";

import { Result } from "@/domain/shared/Result";
import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import type { CreateModule, CreateModuleInput, CreateModuleError } from "@/usecases/CreateModule";
import type { UserRepository } from "@/ports/repositories/UserRepository";

export type CreateModuleActionResult = Result<
  { moduleId: string },
  CreateModuleError | { kind: "unauthorized" }
>;

export async function performCreateModule(
  container: { userRepo: UserRepository; createModule: CreateModule },
  input: CreateModuleInput,
  getCurrentAdminId: (
    container: { userRepo: UserRepository },
  ) => Promise<string | null>,
): Promise<CreateModuleActionResult> {
  const adminId = await getCurrentAdminId(container);
  if (!adminId) {
    return Result.err({ kind: "unauthorized" });
  }

  const result = await container.createModule.execute(input);
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

export async function createModuleAction(
  input: CreateModuleInput,
): Promise<CreateModuleActionResult> {
  const container = buildContainer();
  return performCreateModule(container, input, defaultGetCurrentAdminId);
}

/**
 * UpdateModule — update a module's title.
 *
 * STORY-048b. Reorder is a separate use case (ReorderModules).
 *
 * The patch only includes title; displayOrder is managed by
 * ReorderModules. updatedAt is bumped to the current time.
 */

import { Result } from "@/domain/shared/Result";
import { updateModule, type Module, type UpdateModulePatch } from "@/domain/entities/Module";
import type { IModuleRepository, ModuleError } from "@/ports/repositories/IModuleRepository";
import type { Clock } from "@/ports/system/Clock";

export interface UpdateModuleInput {
  moduleId: string;
  patch: UpdateModulePatch;
}

export type UpdateModuleError =
  | { kind: "module_not_found" }
  | { kind: "invalid_input"; message: string }
  | ModuleError;

export type UpdateModuleResult = Result<
  { module: Module },
  UpdateModuleError
>;

export interface UpdateModuleDeps {
  moduleRepo: IModuleRepository;
  clock: Clock;
}

export class UpdateModule {
  constructor(private readonly deps: UpdateModuleDeps) {}

  async execute(input: UpdateModuleInput): Promise<UpdateModuleResult> {
    // 1. Find
    const findResult = await this.deps.moduleRepo.findById(input.moduleId);
    if (!findResult.ok) {
      if (findResult.error.kind === "not_found") {
        return Result.err({ kind: "module_not_found" });
      }
      return Result.err(findResult.error);
    }
    const existing = findResult.value;

    // 2. Apply patch via the entity factory (with updatedAt bumped)
    const updateResult = updateModule(existing, {
      ...input.patch,
      // updatedAt is set by the entity factory to `new Date()`. We want
      // it to be the injected clock. So patch with a new patch that
      // keeps the existing displayOrder and applies the title.
    });
    if (!updateResult.ok) {
      return Result.err({ kind: "invalid_input", message: updateResult.error.message });
    }
    // Override updatedAt with the injected clock
    const withClock: Module = {
      ...updateResult.value,
      updatedAt: this.deps.clock.now(),
    };

    // 3. Persist
    const persistResult = await this.deps.moduleRepo.update(withClock);
    if (!persistResult.ok) {
      if (persistResult.error.kind === "not_found") {
        return Result.err({ kind: "module_not_found" });
      }
      return Result.err(persistResult.error);
    }
    return Result.ok({ module: persistResult.value });
  }
}

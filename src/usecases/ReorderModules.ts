/**
 * ReorderModules — atomically reorder a course's modules.
 *
 * STORY-048b.
 *
 * The use case delegates the validation to the repository's
 * `reorder` method (which is the authoritative check for "all
 * current modules are present and no extras"). The use case
 * exists to be the SOLID entry point from the server action and
 * to wrap the repo's Module[] result into a { modules: ... }
 * shape consistent with the other use cases.
 */

import { Result } from "@/domain/shared/Result";
import type { Module } from "@/domain/entities/Module";
import type { IModuleRepository, ModuleError } from "@/ports/repositories/IModuleRepository";

export interface ReorderModulesInput {
  courseId: string;
  moduleIds: readonly string[];
}

export type ReorderModulesResult = Result<
  { modules: readonly Module[] },
  ModuleError
>;

export interface ReorderModulesDeps {
  moduleRepo: IModuleRepository;
}

export class ReorderModules {
  constructor(private readonly deps: ReorderModulesDeps) {}

  async execute(input: ReorderModulesInput): Promise<ReorderModulesResult> {
    const r = await this.deps.moduleRepo.reorder(input.courseId, input.moduleIds);
    if (!r.ok) {
      return Result.err(r.error);
    }
    return Result.ok({ modules: r.value });
  }
}

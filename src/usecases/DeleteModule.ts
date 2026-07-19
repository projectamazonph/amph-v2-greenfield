/**
 * DeleteModule — delete a module.
 *
 * STORY-048b. Idempotent semantics: returns `module_not_found` if
 * the id doesn't exist (the caller treats that as a no-op at the
 * action layer).
 *
 * After delete, the remaining modules may have gaps in displayOrder
 * (e.g. 1, 3, 4 after deleting 2). The caller can invoke
 * ReorderModules to renumber sequentially if desired.
 */

import { Result } from "@/domain/shared/Result";
import type { IModuleRepository, ModuleError } from "@/ports/repositories/IModuleRepository";

export interface DeleteModuleInput {
  moduleId: string;
}

export type DeleteModuleError =
  | { kind: "module_not_found" }
  | ModuleError;

export type DeleteModuleResult = Result<
  { deleted: true },
  DeleteModuleError
>;

export interface DeleteModuleDeps {
  moduleRepo: IModuleRepository;
}

export class DeleteModule {
  constructor(private readonly deps: DeleteModuleDeps) {}

  async execute(input: DeleteModuleInput): Promise<DeleteModuleResult> {
    const r = await this.deps.moduleRepo.delete(input.moduleId);
    if (!r.ok) {
      if (r.error.kind === "not_found") {
        return Result.err({ kind: "module_not_found" });
      }
      return Result.err(r.error);
    }
    return Result.ok({ deleted: true });
  }
}

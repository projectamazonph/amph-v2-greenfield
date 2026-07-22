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
import { RecordAuditLog } from "@/usecases/RecordAuditLog";

export interface DeleteModuleInput {
  moduleId: string;
  actorId: string;
}

export type DeleteModuleError = { kind: "module_not_found" } | ModuleError;

export type DeleteModuleResult = Result<{ deleted: true }, DeleteModuleError>;

export interface DeleteModuleDeps {
  moduleRepo: IModuleRepository;
  recordAuditLog: RecordAuditLog;
}

export class DeleteModule {
  constructor(private readonly deps: DeleteModuleDeps) {}

  async execute(input: DeleteModuleInput): Promise<DeleteModuleResult> {
    const r = await this.deps.moduleRepo.delete(input.moduleId);
    if (!r.ok) {
      const error: DeleteModuleError =
        r.error.kind === "not_found" ? { kind: "module_not_found" } : r.error;
      void this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action: "module.delete_failed",
        targetId: input.moduleId,
        targetType: "module",
        metadata: { error: error.kind },
      });
      return Result.err(error);
    }

    void this.deps.recordAuditLog.execute({
      actorId: input.actorId,
      action: "module.deleted",
      targetId: input.moduleId,
      targetType: "module",
      metadata: {},
    });

    return Result.ok({ deleted: true });
  }
}

/**
 * `UpdateResource` — update a download-center resource.
 *
 * STORY-098. STORY-098.5: when the patch swaps in a new `fileKey`
 * (the admin replaced an uploaded file) and the resource previously
 * owned a different uploaded file, the old file is deleted from
 * storage after the DB update succeeds. Best-effort — a failed
 * cleanup leaves an orphaned blob, which is a cost problem, not a
 * correctness one, so it must not fail the update itself.
 *
 * Both the storage delete and every audit-log write are `await`ed, not
 * fire-and-forget. The DB mutation has already committed by that point,
 * so a failure here still can't turn the whole use case into an error —
 * but on a serverless/edge runtime, a `void`-called async write can be
 * silently dropped if the execution context freezes right after the
 * response is sent, before the write actually lands. Awaiting closes
 * that window; failures are logged so cleanup gaps are visible instead
 * of invisible.
 */
import { Result } from "@/domain/shared/Result";
import type { Logger } from "@/ports/observability/Logger";
import {
  updateResource,
  type UpdateResourcePatch,
  type ResourceError,
} from "@/domain/entities/Resource";
import type {
  IResourceRepository,
  ResourceRepositoryError,
} from "@/ports/repositories/IResourceRepository";
import type { IFileStorage } from "@/ports/storage/IFileStorage";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";

export interface UpdateResourceInput {
  id: string;
  patch: UpdateResourcePatch;
  actorId: string;
}

export type UpdateResourceResult = Result<
  { resourceId: string },
  ResourceError | ResourceRepositoryError
>;

export interface UpdateResourceDeps {
  resourceRepo: IResourceRepository;
  fileStorage: IFileStorage;
  recordAuditLog: RecordAuditLog;
  logger: Logger;
}

export class UpdateResource {
  constructor(private readonly deps: UpdateResourceDeps) {}

  async execute(input: UpdateResourceInput): Promise<UpdateResourceResult> {
    const findResult = await this.deps.resourceRepo.findById(input.id);
    if (!findResult.ok) {
      return findResult;
    }
    if (findResult.value === null) {
      return Result.err({ kind: "not_found" });
    }
    const existing = findResult.value;

    const updateResult = updateResource(existing, input.patch, input.actorId);
    if (!updateResult.ok) {
      await this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action: "resource.update_failed",
        targetId: input.id,
        targetType: "resource",
        metadata: { error: updateResult.error.kind },
      });
      return Result.err(updateResult.error);
    }

    const persistResult = await this.deps.resourceRepo.update(updateResult.value);
    if (!persistResult.ok) {
      await this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action: "resource.update_failed",
        targetId: input.id,
        targetType: "resource",
        metadata: {
          error:
            persistResult.error.kind === "db_error"
              ? persistResult.error.message
              : persistResult.error.kind,
        },
      });
      return persistResult;
    }

    await this.deps.recordAuditLog.execute({
      actorId: input.actorId,
      action: "resource.updated",
      targetId: input.id,
      targetType: "resource",
      metadata: { patch: input.patch },
    });

    const oldFileKey = existing.fileKey;
    const newFileKey = updateResult.value.fileKey;
    if (oldFileKey && oldFileKey !== newFileKey) {
      const deleteResult = await this.deps.fileStorage.delete(oldFileKey);
      if (!deleteResult.ok) {
        this.deps.logger.error("[UpdateResource] Failed to delete orphaned file", {
          fileKey: oldFileKey,
          error: deleteResult.error,
        });
      }
    }

    return { ok: true, value: { resourceId: input.id } };
  }
}

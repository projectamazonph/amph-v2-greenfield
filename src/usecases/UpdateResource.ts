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

export class UpdateResource {
  constructor(
    private readonly deps: {
      resourceRepo: IResourceRepository;
      fileStorage: IFileStorage;
      recordAuditLog: RecordAuditLog;
    },
  ) {}

  async execute(input: UpdateResourceInput): Promise<UpdateResourceResult> {
    const findResult = await this.deps.resourceRepo.findById(input.id);
    if (!findResult.ok) {
      return findResult as unknown as UpdateResourceResult;
    }
    if (findResult.value === null) {
      await this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action: "resource.update_failed",
        targetId: input.id,
        targetType: "resource",
        metadata: { error: "not_found" },
      });
      return { ok: false, error: { kind: "not_found" } };
    }

    const updateResult = updateResource(findResult.value, input.patch, input.actorId);
    if (!updateResult.ok) {
      await this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action: "resource.update_failed",
        targetId: input.id,
        targetType: "resource",
        metadata: { error: updateResult.error.kind },
      });
      return updateResult as unknown as UpdateResourceResult;
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
      return persistResult as unknown as UpdateResourceResult;
    }

    await this.deps.recordAuditLog.execute({
      actorId: input.actorId,
      action: "resource.updated",
      targetId: input.id,
      targetType: "resource",
      metadata: { patch: input.patch },
    });

    const oldFileKey = findResult.value.fileKey;
    const newFileKey = updateResult.value.fileKey;
    if (oldFileKey && oldFileKey !== newFileKey) {
      const deleteResult = await this.deps.fileStorage.delete(oldFileKey);
      if (!deleteResult.ok) {
        console.error(
          `[UpdateResource] Failed to delete orphaned file "${oldFileKey}":`,
          deleteResult.error,
        );
      }
    }

    return { ok: true, value: { resourceId: input.id } };
  }
}

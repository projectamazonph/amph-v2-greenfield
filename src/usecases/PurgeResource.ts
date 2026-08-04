/**
 * `PurgeResource` — permanently remove a download-center resource.
 *
 * STORY-098.5. Distinct from `DeleteResource` (which only unpublishes
 * — the row and any uploaded file survive so it can be republished).
 * Purge is for the rare case of a genuinely wrong upload: it removes
 * the DB row and, if the resource owned an uploaded file (`fileKey`
 * set), deletes that file from storage too. External links and
 * pre-installed static assets have no `fileKey`, so purging them only
 * removes the row — there's nothing else we own to delete.
 *
 * File cleanup happens after the row is gone and is best-effort: a
 * failed blob delete leaves an orphan, which doesn't need to block
 * the purge succeeding.
 *
 * The file delete and every audit-log write are `await`ed, not
 * fire-and-forget — a `void`-called async write can be silently dropped
 * if a serverless/edge execution context freezes right after the
 * response is sent, before the write lands. Awaiting doesn't change the
 * best-effort *contract* (a storage-cleanup failure still doesn't fail
 * the purge, since the row is already gone), it just makes sure the
 * attempt actually completes and any failure gets logged instead of
 * disappearing.
 */
import type { Result } from "@/domain/shared/Result";
import type {
  IResourceRepository,
  ResourceRepositoryError,
} from "@/ports/repositories/IResourceRepository";
import type { IFileStorage } from "@/ports/storage/IFileStorage";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";

export interface PurgeResourceInput {
  id: string;
  actorId: string;
}

export type PurgeResourceResult = Result<{ resourceId: string }, ResourceRepositoryError>;

export class PurgeResource {
  constructor(
    private readonly deps: {
      resourceRepo: IResourceRepository;
      fileStorage: IFileStorage;
      recordAuditLog: RecordAuditLog;
    },
  ) {}

  async execute(input: PurgeResourceInput): Promise<PurgeResourceResult> {
    const findResult = await this.deps.resourceRepo.findById(input.id);
    if (!findResult.ok) {
      await this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action: "resource.purge_failed",
        targetId: input.id,
        targetType: "resource",
        metadata: { error: findResult.error.kind },
      });
      return findResult;
    }
    if (findResult.value === null) {
      await this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action: "resource.purge_failed",
        targetId: input.id,
        targetType: "resource",
        metadata: { error: "not_found" },
      });
      return { ok: false, error: { kind: "not_found" } };
    }

    const fileKey = findResult.value.fileKey;

    const deleteResult = await this.deps.resourceRepo.hardDelete(input.id);
    if (!deleteResult.ok) {
      await this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action: "resource.purge_failed",
        targetId: input.id,
        targetType: "resource",
        metadata: { error: deleteResult.error.kind },
      });
      return deleteResult;
    }

    if (fileKey) {
      const deleteResult = await this.deps.fileStorage.delete(fileKey);
      if (!deleteResult.ok) {
        console.error(
          `[PurgeResource] Failed to delete purged file "${fileKey}":`,
          deleteResult.error,
        );
      }
    }

    await this.deps.recordAuditLog.execute({
      actorId: input.actorId,
      action: "resource.purged",
      targetId: input.id,
      targetType: "resource",
      metadata: { hadUploadedFile: fileKey !== null },
    });

    return { ok: true, value: { resourceId: input.id } };
  }
}

/**
 * `DeleteResource` — soft-delete (unpublish) a download-center resource.
 *
 * STORY-098.
 */
import type { Result } from "@/domain/shared/Result";
import type {
  IResourceRepository,
  ResourceRepositoryError,
} from "@/ports/repositories/IResourceRepository";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";

export interface DeleteResourceInput {
  id: string;
  actorId: string;
}

export type DeleteResourceResult = Result<{ resourceId: string }, ResourceRepositoryError>;

export class DeleteResource {
  constructor(
    private readonly deps: {
      resourceRepo: IResourceRepository;
      recordAuditLog: RecordAuditLog;
    },
  ) {}

  async execute(input: DeleteResourceInput): Promise<DeleteResourceResult> {
    // Idempotent: if already unpublished, treat as success.
    const findResult = await this.deps.resourceRepo.findById(input.id);
    if (!findResult.ok) {
      void this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action: "resource.delete_failed",
        targetId: input.id,
        targetType: "resource",
        metadata: { error: findResult.error.kind },
      });
      return findResult as unknown as DeleteResourceResult;
    }

    const alreadyUnpublished = findResult.value === null || !findResult.value.isPublished;

    if (!alreadyUnpublished) {
      const deleteResult = await this.deps.resourceRepo.delete(input.id);
      if (!deleteResult.ok) {
        void this.deps.recordAuditLog.execute({
          actorId: input.actorId,
          action: "resource.delete_failed",
          targetId: input.id,
          targetType: "resource",
          metadata: { error: deleteResult.error.kind },
        });
        return deleteResult as unknown as DeleteResourceResult;
      }

      void this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action: "resource.deleted",
        targetId: input.id,
        targetType: "resource",
        metadata: {},
      });
    }

    return { ok: true, value: { resourceId: input.id } };
  }
}

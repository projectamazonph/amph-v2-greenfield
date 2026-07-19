/**
 * `DeleteLiveClass` — soft-delete (archive) a live class.
 *
 * STORY-050c.
 */
import type { Result } from "@/domain/shared/Result";
import type {
  ILiveClassRepository,
  LiveClassRepositoryError,
} from "@/ports/repositories/ILiveClassRepository";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";

export interface DeleteLiveClassInput {
  id: string;
  actorId: string;
}

export type DeleteLiveClassResult = Result<
  { liveClassId: string },
  LiveClassRepositoryError
>;

export class DeleteLiveClass {
  constructor(
    private readonly deps: {
      liveClassRepo: ILiveClassRepository;
      recordAuditLog: RecordAuditLog;
    },
  ) {}

  async execute(input: DeleteLiveClassInput): Promise<DeleteLiveClassResult> {
    // Idempotent: if already deleted (cancelled), treat as success
    const findResult = await this.deps.liveClassRepo.findById(input.id);
    if (!findResult.ok) {
      void this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action: "live_class.delete_failed",
        targetId: input.id,
        targetType: "live_class",
        metadata: { error: findResult.error.kind },
      });
      return findResult as unknown as DeleteLiveClassResult;
    }

    const wasCancelled = findResult.value === null || findResult.value.status === "cancelled";

    if (!wasCancelled) {
      const deleteResult = await this.deps.liveClassRepo.delete(input.id);
      if (!deleteResult.ok) {
        void this.deps.recordAuditLog.execute({
          actorId: input.actorId,
          action: "live_class.delete_failed",
          targetId: input.id,
          targetType: "live_class",
          metadata: { error: deleteResult.error.kind },
        });
        return deleteResult as unknown as DeleteLiveClassResult;
      }

      void this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action: "live_class.deleted",
        targetId: input.id,
        targetType: "live_class",
        metadata: {},
      });
    }

    return { ok: true, value: { liveClassId: input.id } };
  }
}

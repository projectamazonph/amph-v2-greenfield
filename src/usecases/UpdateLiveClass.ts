/**
 * `UpdateLiveClass` — update a live class.
 *
 * STORY-050c.
 */
import { Result } from "@/domain/shared/Result";
import {
  updateLiveClass,
  type UpdateLiveClassPatch,
  type LiveClassError,
} from "@/domain/entities/LiveClass";
import type {
  ILiveClassRepository,
  LiveClassRepositoryError,
} from "@/ports/repositories/ILiveClassRepository";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";

export interface UpdateLiveClassInput {
  id: string;
  patch: UpdateLiveClassPatch;
  actorId: string;
}

export type UpdateLiveClassResult = Result<
  { liveClassId: string },
  LiveClassError | LiveClassRepositoryError
>;

export class UpdateLiveClass {
  constructor(
    private readonly deps: {
      liveClassRepo: ILiveClassRepository;
      recordAuditLog: RecordAuditLog;
    },
  ) {}

  async execute(input: UpdateLiveClassInput): Promise<UpdateLiveClassResult> {
    const findResult = await this.deps.liveClassRepo.findById(input.id);
    if (!findResult.ok) {
      return findResult as unknown as UpdateLiveClassResult;
    }
    if (findResult.value === null) {
      void this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action: "live_class.update_failed",
        targetId: input.id,
        targetType: "live_class",
        metadata: { error: "not_found" },
      });
      return { ok: false, error: { kind: "not_found" } };
    }

    const updateResult = updateLiveClass(findResult.value, input.patch);
    if (!updateResult.ok) {
      void this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action: "live_class.update_failed",
        targetId: input.id,
        targetType: "live_class",
        metadata: { error: updateResult.error.kind },
      });
      return updateResult as unknown as UpdateLiveClassResult;
    }

    const persistResult = await this.deps.liveClassRepo.update(
      updateResult.value,
    );
    if (!persistResult.ok) {
      void this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action: "live_class.update_failed",
        targetId: input.id,
        targetType: "live_class",
        metadata: {
          error: persistResult.error.kind === "db_error"
            ? persistResult.error.message
            : persistResult.error.kind,
        },
      });
      return persistResult as unknown as UpdateLiveClassResult;
    }

    void this.deps.recordAuditLog.execute({
      actorId: input.actorId,
      action: "live_class.updated",
      targetId: input.id,
      targetType: "live_class",
      metadata: { patch: input.patch },
    });

    return { ok: true, value: { liveClassId: input.id } };
  }
}

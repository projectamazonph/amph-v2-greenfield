/**
 * `UpdateResource` — update a download-center resource.
 *
 * STORY-098.
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
      recordAuditLog: RecordAuditLog;
    },
  ) {}

  async execute(input: UpdateResourceInput): Promise<UpdateResourceResult> {
    const findResult = await this.deps.resourceRepo.findById(input.id);
    if (!findResult.ok) {
      return findResult as unknown as UpdateResourceResult;
    }
    if (findResult.value === null) {
      void this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action: "resource.update_failed",
        targetId: input.id,
        targetType: "resource",
        metadata: { error: "not_found" },
      });
      return { ok: false, error: { kind: "not_found" } };
    }

    const updateResult = updateResource(findResult.value, input.patch);
    if (!updateResult.ok) {
      void this.deps.recordAuditLog.execute({
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
      void this.deps.recordAuditLog.execute({
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

    void this.deps.recordAuditLog.execute({
      actorId: input.actorId,
      action: "resource.updated",
      targetId: input.id,
      targetType: "resource",
      metadata: { patch: input.patch },
    });

    return { ok: true, value: { resourceId: input.id } };
  }
}

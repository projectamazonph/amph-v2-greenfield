/**
 * `CreateResource` — create a new download-center resource.
 *
 * STORY-098.
 */
import { Result } from "@/domain/shared/Result";
import {
  createResource,
  type CreateResourceInput,
  type ResourceError,
} from "@/domain/entities/Resource";
import type {
  IResourceRepository,
  ResourceRepositoryError,
} from "@/ports/repositories/IResourceRepository";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";

export interface CreateResourceInput_ extends Omit<CreateResourceInput, "id"> {
  id: string;
  actorId: string;
}

export type CreateResourceResult = Result<
  { resourceId: string },
  ResourceError | ResourceRepositoryError
>;

export class CreateResource {
  constructor(
    private readonly deps: {
      resourceRepo: IResourceRepository;
      recordAuditLog: RecordAuditLog;
    },
  ) {}

  async execute(input: CreateResourceInput_): Promise<CreateResourceResult> {
    const resourceResult = createResource({
      id: input.id,
      title: input.title,
      description: input.description,
      category: input.category,
      fileType: input.fileType,
      fileUrl: input.fileUrl,
      fileKey: input.fileKey,
      accessTier: input.accessTier,
      createdById: input.actorId,
    });

    if (!resourceResult.ok) {
      void this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action: "resource.create_failed",
        targetId: input.id,
        targetType: "resource",
        metadata: { error: resourceResult.error.kind },
      });
      const validationErrors = resourceResult.error;
      return Result.err({
        kind: validationErrors.kind,
      } as ResourceError | ResourceRepositoryError);
    }

    const persistResult = await this.deps.resourceRepo.create(resourceResult.value);
    if (!persistResult.ok) {
      void this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action: "resource.create_failed",
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

    void this.deps.recordAuditLog.execute({
      actorId: input.actorId,
      action: "resource.created",
      targetId: input.id,
      targetType: "resource",
      metadata: { title: input.title, category: input.category, accessTier: input.accessTier },
    });

    return { ok: true, value: { resourceId: input.id } };
  }
}

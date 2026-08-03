/**
 * `AdminListResources` — list every download-center resource for the
 * admin panel, published or not.
 *
 * STORY-098.
 */
import type { Result } from "@/domain/shared/Result";
import type { Resource } from "@/domain/entities/Resource";
import type {
  IResourceRepository,
  ResourceRepositoryError,
} from "@/ports/repositories/IResourceRepository";

export type AdminListResourcesResult = Result<Resource[], ResourceRepositoryError>;

export class AdminListResources {
  constructor(private readonly deps: { resourceRepo: IResourceRepository }) {}

  async execute(): Promise<AdminListResourcesResult> {
    return this.deps.resourceRepo.listAll();
  }
}

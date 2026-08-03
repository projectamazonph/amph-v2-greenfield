/**
 * `AdminGetResource` — get a single download-center resource by ID.
 *
 * STORY-098.
 */
import type { Result } from "@/domain/shared/Result";
import type { Resource } from "@/domain/entities/Resource";
import type {
  IResourceRepository,
  ResourceRepositoryError,
} from "@/ports/repositories/IResourceRepository";

export type AdminGetResourceResult = Result<Resource, ResourceRepositoryError>;

export class AdminGetResource {
  constructor(private readonly deps: { resourceRepo: IResourceRepository }) {}

  async execute(id: string): Promise<AdminGetResourceResult> {
    const r = await this.deps.resourceRepo.findById(id);
    if (!r.ok) return { ok: false, error: r.error };
    if (r.value === null) {
      return { ok: false, error: { kind: "not_found" } };
    }
    return { ok: true, value: r.value };
  }
}

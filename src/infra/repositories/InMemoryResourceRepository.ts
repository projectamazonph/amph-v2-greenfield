/**
 * In-memory `IResourceRepository` adapter. Used by `buildTestContainer()`.
 *
 * STORY-098.
 */
import type { Result } from "@/domain/shared/Result";
import type {
  IResourceRepository,
  ResourceRepositoryError,
} from "@/ports/repositories/IResourceRepository";
import type { Resource } from "@/domain/entities/Resource";

export class InMemoryResourceRepository implements IResourceRepository {
  private readonly _resources = new Map<string, Resource>();

  async listAll(): Promise<Result<Resource[], ResourceRepositoryError>> {
    const all = Array.from(this._resources.values());
    all.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return { ok: true, value: all };
  }

  async listPublished(): Promise<Result<Resource[], ResourceRepositoryError>> {
    const all = Array.from(this._resources.values()).filter((r) => r.isPublished);
    all.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return { ok: true, value: all };
  }

  async findById(id: string): Promise<Result<Resource | null, ResourceRepositoryError>> {
    return { ok: true, value: this._resources.get(id) ?? null };
  }

  async create(resource: Resource): Promise<Result<void, ResourceRepositoryError>> {
    if (this._resources.has(resource.id)) {
      return {
        ok: false,
        error: { kind: "db_error", message: `Resource ${resource.id} already exists` },
      };
    }
    this._resources.set(resource.id, resource);
    return { ok: true, value: undefined };
  }

  async update(resource: Resource): Promise<Result<void, ResourceRepositoryError>> {
    if (!this._resources.has(resource.id)) {
      return { ok: false, error: { kind: "not_found" } };
    }
    this._resources.set(resource.id, resource);
    return { ok: true, value: undefined };
  }

  async delete(id: string): Promise<Result<void, ResourceRepositoryError>> {
    const resource = this._resources.get(id);
    if (!resource) {
      return { ok: false, error: { kind: "not_found" } };
    }
    this._resources.set(id, { ...resource, isPublished: false, updatedAt: new Date() });
    return { ok: true, value: undefined };
  }

  async hardDelete(id: string): Promise<Result<void, ResourceRepositoryError>> {
    if (!this._resources.has(id)) {
      return { ok: false, error: { kind: "not_found" } };
    }
    this._resources.delete(id);
    return { ok: true, value: undefined };
  }

  async incrementDownloadCount(id: string): Promise<Result<void, ResourceRepositoryError>> {
    const resource = this._resources.get(id);
    if (!resource) {
      return { ok: false, error: { kind: "not_found" } };
    }
    this._resources.set(id, {
      ...resource,
      downloadCount: resource.downloadCount + 1,
      updatedAt: new Date(),
    });
    return { ok: true, value: undefined };
  }

  // ── Test helpers ─────────────────────────────────────────────────────

  /** Seed a resource directly into the store. */
  seed(resource: Resource): void {
    this._resources.set(resource.id, resource);
  }

  /** Remove all entries. */
  clear(): void {
    this._resources.clear();
  }
}

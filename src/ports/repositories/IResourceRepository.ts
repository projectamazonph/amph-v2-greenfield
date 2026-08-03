/**
 * `IResourceRepository` — port for download-center resource persistence.
 *
 * STORY-098.
 */
import type { Result } from "@/domain/shared/Result";
import type { Resource } from "@/domain/entities/Resource";

export type ResourceRepositoryError = { kind: "not_found" } | { kind: "db_error"; message: string };

export interface IResourceRepository {
  /** List every resource, published or not. Admin-only view. */
  listAll(): Promise<Result<Resource[], ResourceRepositoryError>>;

  /** List published resources only. The student-facing download center. */
  listPublished(): Promise<Result<Resource[], ResourceRepositoryError>>;

  /** Find a single resource by ID. Returns null if not found. */
  findById(id: string): Promise<Result<Resource | null, ResourceRepositoryError>>;

  /** Persist a newly created resource. */
  create(resource: Resource): Promise<Result<void, ResourceRepositoryError>>;

  /** Persist updates to an existing resource. */
  update(resource: Resource): Promise<Result<void, ResourceRepositoryError>>;

  /** Soft-delete (unpublish) a resource. */
  delete(id: string): Promise<Result<void, ResourceRepositoryError>>;

  /** Permanently remove the row. Used by PurgeResource; does not touch storage. */
  hardDelete(id: string): Promise<Result<void, ResourceRepositoryError>>;

  /** Atomically bump the download counter by 1. */
  incrementDownloadCount(id: string): Promise<Result<void, ResourceRepositoryError>>;
}

/**
 * `ILiveClassRepository` — port for live class persistence.
 *
 * STORY-050c.
 */
import type { Result } from "@/domain/shared/Result";
import type { LiveClass } from "@/domain/entities/LiveClass";

export type LiveClassRepositoryError =
  | { kind: "not_found" }
  | { kind: "db_error"; message: string };

export interface ILiveClassRepository {
  /** List all live classes, optionally filtered by course. Excludes cancelled. */
  listAll(opts?: { courseId?: string }): Promise<
    Result<LiveClass[], LiveClassRepositoryError>
  >;

  /** Find a single live class by ID. Returns null if not found. */
  findById(id: string): Promise<Result<LiveClass | null, LiveClassRepositoryError>>;

  /** Persist a newly created live class. */
  create(liveClass: LiveClass): Promise<Result<void, LiveClassRepositoryError>>;

  /** Persist updates to an existing live class. */
  update(liveClass: LiveClass): Promise<Result<void, LiveClassRepositoryError>>;

  /** Soft-delete (archive) a live class. */
  delete(id: string): Promise<Result<void, LiveClassRepositoryError>>;
}

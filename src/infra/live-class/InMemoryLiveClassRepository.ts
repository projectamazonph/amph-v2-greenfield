/**
 * In-memory `ILiveClassRepository` adapter.
 * Ships in production until a Prisma schema + adapter is available.
 *
 * STORY-050c.
 */
import type { Result } from "@/domain/shared/Result";
import type {
  ILiveClassRepository,
  LiveClassRepositoryError,
} from "@/ports/repositories/ILiveClassRepository";
import type { LiveClass } from "@/domain/entities/LiveClass";

export class InMemoryLiveClassRepository implements ILiveClassRepository {
  private readonly _liveClasses = new Map<string, LiveClass>();

  async listAll(opts?: {
    courseId?: string;
  }): Promise<Result<LiveClass[], LiveClassRepositoryError>> {
    try {
      const all = Array.from(this._liveClasses.values()).filter(
        (lc) => lc.status !== "cancelled",
      );
      const filtered = opts?.courseId
        ? all.filter((lc) => lc.courseId === opts.courseId)
        : all;
      // Sort by scheduledAt ascending
      filtered.sort(
        (a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime(),
      );
      return { ok: true, value: filtered };
    } catch (e) {
      return {
        ok: false,
        error: {
          kind: "db_error",
          message: String(e),
        },
      };
    }
  }

  async findById(
    id: string,
  ): Promise<Result<LiveClass | null, LiveClassRepositoryError>> {
    try {
      return { ok: true, value: this._liveClasses.get(id) ?? null };
    } catch (e) {
      return {
        ok: false,
        error: {
          kind: "db_error",
          message: String(e),
        },
      };
    }
  }

  async create(
    liveClass: LiveClass,
  ): Promise<Result<void, LiveClassRepositoryError>> {
    try {
      if (this._liveClasses.has(liveClass.id)) {
        return {
          ok: false,
          error: {
            kind: "db_error",
            message: `Live class ${liveClass.id} already exists`,
          },
        };
      }
      this._liveClasses.set(liveClass.id, liveClass);
      return { ok: true, value: undefined };
    } catch (e) {
      return {
        ok: false,
        error: {
          kind: "db_error",
          message: String(e),
        },
      };
    }
  }

  async update(
    liveClass: LiveClass,
  ): Promise<Result<void, LiveClassRepositoryError>> {
    try {
      if (!this._liveClasses.has(liveClass.id)) {
        return { ok: false, error: { kind: "not_found" } };
      }
      this._liveClasses.set(liveClass.id, liveClass);
      return { ok: true, value: undefined };
    } catch (e) {
      return {
        ok: false,
        error: {
          kind: "db_error",
          message: String(e),
        },
      };
    }
  }

  async delete(id: string): Promise<Result<void, LiveClassRepositoryError>> {
    try {
      if (!this._liveClasses.has(id)) {
        return { ok: false, error: { kind: "not_found" } };
      }
      // Soft-delete: mark as cancelled
      const lc = this._liveClasses.get(id)!;
      this._liveClasses.set(id, {
        ...lc,
        status: "cancelled",
        updatedAt: new Date(),
      });
      return { ok: true, value: undefined };
    } catch (e) {
      return {
        ok: false,
        error: {
          kind: "db_error",
          message: String(e),
        },
      };
    }
  }

  // ── Test helpers ──────────────────────────────────────────────────────────

  /** Seed a live class directly into the store. */
  seed(lc: LiveClass): void {
    this._liveClasses.set(lc.id, lc);
  }

  /** Remove all entries. */
  clear(): void {
    this._liveClasses.clear();
  }
}

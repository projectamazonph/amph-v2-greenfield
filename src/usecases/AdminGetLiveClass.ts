/**
 * `AdminGetLiveClass` — get a single live class by ID.
 *
 * STORY-050c.
 */
import type { Result } from "@/domain/shared/Result";
import type { LiveClass } from "@/domain/entities/LiveClass";
import type {
  ILiveClassRepository,
  LiveClassRepositoryError,
} from "@/ports/repositories/ILiveClassRepository";

export type AdminGetLiveClassResult = Result<
  LiveClass,
  LiveClassRepositoryError
>;

export class AdminGetLiveClass {
  constructor(private readonly deps: { liveClassRepo: ILiveClassRepository }) {}

  async execute(id: string): Promise<AdminGetLiveClassResult> {
    const r = await this.deps.liveClassRepo.findById(id);
    if (!r.ok) return { ok: false, error: r.error };
    if (r.value === null) {
      return { ok: false, error: { kind: "not_found" } };
    }
    return { ok: true, value: r.value };
  }
}

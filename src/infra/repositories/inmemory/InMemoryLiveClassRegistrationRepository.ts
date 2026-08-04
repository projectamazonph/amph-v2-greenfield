import { Result } from "@/domain/shared/Result";
import type { LiveClassRegistration } from "@/domain/entities/LiveClassRegistration";
import type {
  ILiveClassRegistrationRepository,
  LiveClassRegistrationRepositoryError,
} from "@/ports/repositories/ILiveClassRegistrationRepository";

/**
 * In-memory test adapter for `ILiveClassRegistrationRepository`.
 *
 * Lives next to the other in-memory repos under `src/infra/repositories/`.
 * Tests use this; production uses the Prisma adapter (added separately).
 */
export class InMemoryLiveClassRegistrationRepository implements ILiveClassRegistrationRepository {
  private readonly rows = new Map<string, LiveClassRegistration>();

  private key(userId: string, liveClassId: string): string {
    return `${userId}::${liveClassId}`;
  }

  async listByUser(
    userId: string,
  ): Promise<Result<LiveClassRegistration[], LiveClassRegistrationRepositoryError>> {
    const out: LiveClassRegistration[] = [];
    for (const r of this.rows.values()) {
      if (r.userId === userId) out.push(r);
    }
    out.sort((a, b) => b.registeredAt.getTime() - a.registeredAt.getTime());
    return Result.ok(out);
  }

  async listByLiveClass(
    liveClassId: string,
  ): Promise<Result<LiveClassRegistration[], LiveClassRegistrationRepositoryError>> {
    const out: LiveClassRegistration[] = [];
    for (const r of this.rows.values()) {
      if (r.liveClassId === liveClassId) out.push(r);
    }
    return Result.ok(out);
  }

  async findByUserAndClass(
    userId: string,
    liveClassId: string,
  ): Promise<Result<LiveClassRegistration | null, LiveClassRegistrationRepositoryError>> {
    const r = this.rows.get(this.key(userId, liveClassId));
    if (!r) return Result.ok(null);
    // Return a copy so callers can't mutate the in-memory record.
    return Result.ok({ ...r });
  }

  async create(
    registration: LiveClassRegistration,
  ): Promise<Result<void, LiveClassRegistrationRepositoryError>> {
    const k = this.key(registration.userId, registration.liveClassId);
    if (this.rows.has(k)) {
      return Result.err({ kind: "already_registered" });
    }
    this.rows.set(k, { ...registration });
    return Result.ok(undefined);
  }

  async update(
    registration: LiveClassRegistration,
  ): Promise<Result<void, LiveClassRegistrationRepositoryError>> {
    const k = this.key(registration.userId, registration.liveClassId);
    if (!this.rows.has(k)) {
      return Result.err({ kind: "not_found" });
    }
    this.rows.set(k, { ...registration });
    return Result.ok(undefined);
  }

  async markRecordingWatched(
    userId: string,
    liveClassId: string,
    watchedAt: Date,
  ): Promise<Result<boolean, LiveClassRegistrationRepositoryError>> {
    const k = this.key(userId, liveClassId);
    const existing = this.rows.get(k);
    if (!existing) {
      return Result.err({ kind: "not_found" });
    }
    if (existing.watchedRecordingAt) {
      return Result.ok(false);
    }
    this.rows.set(k, { ...existing, watchedRecordingAt: watchedAt, status: "attended" });
    return Result.ok(true);
  }
}

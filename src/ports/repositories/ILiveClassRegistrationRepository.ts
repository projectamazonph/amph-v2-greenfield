/**
 * `ILiveClassRegistrationRepository` — port for live-class RSVP persistence.
 *
 * STORY-091.
 */
import type { Result } from "@/domain/shared/Result";
import type { LiveClassRegistration } from "@/domain/entities/LiveClassRegistration";

export type LiveClassRegistrationRepositoryError =
  { kind: "not_found" } | { kind: "already_registered" } | { kind: "db_error"; message: string };

export interface ILiveClassRegistrationRepository {
  /** List all RSVP rows for a given user. Newest first. */
  listByUser(
    userId: string,
  ): Promise<Result<LiveClassRegistration[], LiveClassRegistrationRepositoryError>>;

  /** List all registered user IDs for a given live class. Used by admin views. */
  listByLiveClass(
    liveClassId: string,
  ): Promise<Result<LiveClassRegistration[], LiveClassRegistrationRepositoryError>>;

  /**
   * Find one RSVP row for the (userId, liveClassId) tuple. Returns null
   * if there is no row yet (the user has not RSVP'd).
   */
  findByUserAndClass(
    userId: string,
    liveClassId: string,
  ): Promise<Result<LiveClassRegistration | null, LiveClassRegistrationRepositoryError>>;

  /** Persist a new RSVP. Returns `already_registered` if one already exists. */
  create(
    registration: LiveClassRegistration,
  ): Promise<Result<void, LiveClassRegistrationRepositoryError>>;

  /** Replace an existing RSVP (used for cancel + re-RSVP). */
  update(
    registration: LiveClassRegistration,
  ): Promise<Result<void, LiveClassRegistrationRepositoryError>>;

  /**
   * Atomically mark the (userId, liveClassId) registration's recording as
   * watched, but only if it hasn't been marked already.
   *
   * Unlike `update()`, this is a conditional write: it must only flip
   * `watchedRecordingAt` when it is currently null, and must report
   * whether it actually did so. Two concurrent callers racing on the
   * same registration must have exactly one of them observe `true` — the
   * caller uses that to decide whether to award XP, so this is the guard
   * against double-awarding, not an in-process read-then-write check.
   *
   * Returns `Result.ok(true)` if this call flipped the row,
   * `Result.ok(false)` if it was already watched (a no-op — someone else
   * won the race, or a caller retried), `not_found` if the registration
   * doesn't exist.
   */
  markRecordingWatched(
    userId: string,
    liveClassId: string,
    watchedAt: Date,
  ): Promise<Result<boolean, LiveClassRegistrationRepositoryError>>;
}

/**
 * `ILiveClassRegistrationRepository` — port for live-class RSVP persistence.
 *
 * STORY-091.
 */
import type { Result } from "@/domain/shared/Result";
import type { LiveClassRegistration } from "@/domain/entities/LiveClassRegistration";

export type LiveClassRegistrationRepositoryError =
  | { kind: "not_found" }
  | { kind: "already_registered" }
  | { kind: "db_error"; message: string };

export interface ILiveClassRegistrationRepository {
  /** List all RSVP rows for a given user. Newest first. */
  listByUser(userId: string): Promise<
    Result<LiveClassRegistration[], LiveClassRegistrationRepositoryError>
  >;

  /** List all registered user IDs for a given live class. Used by admin views. */
  listByLiveClass(liveClassId: string): Promise<
    Result<LiveClassRegistration[], LiveClassRegistrationRepositoryError>
  >;

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
}
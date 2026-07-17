/**
 * SessionRepository port — Story 012.
 *
 * Persists and retrieves user sessions.
 * ADR-014: Every port method returns Result. Never throw.
 */

import { Result } from "@/domain/shared/Result";

export type SessionError =
  | { kind: "not_found" }
  | { kind: "db_error"; message: string };

export interface SessionRepository {
  /**
   * Find a session by its unique ID.
   */
  findById(id: string): Promise<Result<SessionRecord, SessionError>>;

  /**
   * Persist a new session.
   */
  create(params: {
    id: string;
    userId: string;
    tokenHash: string;
    userAgent?: string;
    ipAddress?: string;
    expiresAt: Date;
  }): Promise<Result<SessionRecord, SessionError>>;

  /**
   * Delete a session (logout).
   */
  deleteById(id: string): Promise<Result<void, SessionError>>;

  /**
   * Delete all sessions for a user (logout everywhere).
   */
  deleteAllForUser(userId: string): Promise<Result<void, SessionError>>;
}

export interface SessionRecord {
  readonly id: string;
  readonly userId: string;
  readonly tokenHash: string;
  readonly expiresAt: Date;
  readonly createdAt: Date;
}

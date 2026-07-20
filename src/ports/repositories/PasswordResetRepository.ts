/**
 * PasswordResetRepository port — STORY-008.
 *
 * Persists password-reset tokens. Tokens are SHA-256 hashed before
 * being stored; the raw token never touches the database.
 *
 * The "invalidate all for user" method is used on a new reset
 * request so only the latest reset link works.
 *
 * ADR-014: every method returns Result<T, E>.
 */

import type { Result } from "@/domain/shared/Result";

export interface PasswordResetRecord {
  readonly id: string;
  readonly userId: string;
  readonly tokenHash: string;
  readonly expiresAt: Date;
  readonly usedAt: Date | null;
  readonly createdAt: Date;
}

export type PasswordResetError =
  | { kind: "not_found" }
  | { kind: "db_error"; message: string };

export interface PasswordResetRepository {
  /**
   * Persist a new reset record. Returns the new record's ID.
   */
  create(args: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<Result<{ id: string }, PasswordResetError>>;

  /**
   * Look up a reset record by its (hashed) token.
   */
  findByTokenHash(
    tokenHash: string,
  ): Promise<Result<PasswordResetRecord, PasswordResetError>>;

  /**
   * Mark a token as used. Idempotent (filter on usedAt IS NULL).
   */
  markUsed(id: string): Promise<Result<void, PasswordResetError>>;

  /**
   * Mark all of a user's existing tokens as used. Called when
   * a new reset is requested so only the latest token works.
   * Returns the number of rows affected.
   */
  invalidateAllForUser(
    userId: string,
  ): Promise<Result<{ count: number }, PasswordResetError>>;
}

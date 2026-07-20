/**
 * EmailVerificationRepository port — STORY-007.
 *
 * Persists email verification tokens. Tokens are SHA-256 hashed
 * before being stored; the raw token never touches the database.
 * ADR-014: every method returns Result<T, E>.
 */

import type { Result } from "@/domain/shared/Result";

/**
 * One row in the email_verifications table. The `tokenHash` is
 * SHA-256(rawToken). A token becomes useless once `usedAt` is
 * set; rows may also have a TTL via `expiresAt`.
 */
export interface EmailVerificationRecord {
  readonly id: string;
  readonly userId: string;
  readonly tokenHash: string;
  readonly expiresAt: Date;
  /** When the user clicked the verification link. Null until then. */
  readonly usedAt: Date | null;
  readonly createdAt: Date;
}

export type EmailVerificationError =
  | { kind: "not_found" }
  | { kind: "db_error"; message: string };

export interface EmailVerificationRepository {
  /**
   * Persist a new verification record. Returns the new record's
   * ID on success.
   */
  create(args: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<Result<{ id: string }, EmailVerificationError>>;

  /**
   * Look up a verification record by its (hashed) token. Returns
   * not_found if no such token exists. The use case decides what
   * to do with the result (check usedAt, check expiresAt).
   */
  findByTokenHash(
    tokenHash: string,
  ): Promise<Result<EmailVerificationRecord, EmailVerificationError>>;

  /**
   * Mark a token as used. Returns not_found if the ID doesn't
   * exist. Idempotent in spirit (marking a used token as used
   * again is a no-op for the business but still returns ok).
   */
  markUsed(id: string): Promise<Result<void, EmailVerificationError>>;
}

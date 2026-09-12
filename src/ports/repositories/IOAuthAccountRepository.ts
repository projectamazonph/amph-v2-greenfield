/**
 * IOAuthAccountRepository — port for social-login linkages.
 *
 * P1-04 (PR-D). Entities in, entities out. Provider identities are
 * globally unique: at most one row per (provider, providerUserId).
 * Deleting a user cascades to their links at the DB level.
 *
 * Implementations: PrismaOAuthAccountRepository (prod),
 * InMemoryOAuthAccountRepository (tests).
 *
 * ADR-014: every port method returns Result<T, E>. No exceptions
 * across boundaries.
 */

import type { Result } from "@/domain/shared/Result";
import type { OAuthAccount, OAuthProvider } from "@/domain/entities/OAuthAccount";

export type OAuthAccountRepoError =
  | { kind: "not_found" }
  | { kind: "db_error"; message: string };

/**
 * Writes and single-row reads never report `not_found`: a missing
 * link is a null, and a duplicate identity is a `db_error`. Only
 * `delete` can hit a missing row.
 */
export type OAuthAccountQueryError = { kind: "db_error"; message: string };

export interface IOAuthAccountRepository {
  /**
   * Persist a new link.
   *
   * Errors: `db_error` — database failure, including a duplicate
   * (provider, providerUserId) identity.
   */
  create(account: OAuthAccount): Promise<Result<OAuthAccount, OAuthAccountQueryError>>;

  /** The link for a provider identity, or null when never linked. */
  findByProvider(
    provider: OAuthProvider,
    providerUserId: string,
  ): Promise<Result<OAuthAccount | null, OAuthAccountQueryError>>;

  /** Every link owned by a user, oldest first. */
  listByUser(userId: string): Promise<Result<readonly OAuthAccount[], OAuthAccountQueryError>>;

  /**
   * Persist token refreshes on an existing link.
   * Errors: `not_found` — no link with this id exists.
   */
  update(account: OAuthAccount): Promise<Result<OAuthAccount, OAuthAccountRepoError>>;

  /**
   * Remove one provider link from a user.
   * Errors: `not_found` — the user has no such link.
   */
  delete(userId: string, provider: OAuthProvider): Promise<Result<void, OAuthAccountRepoError>>;
}

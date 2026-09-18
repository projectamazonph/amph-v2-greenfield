/**
 * UserRepository port — the interface for persisting and retrieving users.
 *
 * Defined in src/ports/ so the domain and use-case layers can depend on
 * this abstraction. The implementation lives in src/infra/repositories/.
 *
 * ADR-014: Every port method returns Result<T, E>. No exceptions across boundaries.
 */

import type { User, SubscriptionTier } from "@/domain/entities/User";
import { Result } from "@/domain/shared/Result";

export type UserError =
  { kind: "not_found" } | { kind: "email_taken" } | { kind: "db_error"; message: string };

export interface UserRepository {
  /**
   * Find a user by their unique ID.
   * Returns not_found if the ID does not exist.
   */
  findById(id: string): Promise<Result<User, UserError>>;

  /**
   * Batch-find users by a list of IDs. Deduplicates internally.
   * Returns an empty list for an empty input array.
   *
   * Used by the audit-log page to batch-fetch actor emails in one
   * query instead of N individual findById calls (H3 fix).
   */
  findByIds(ids: readonly string[]): Promise<Result<readonly User[], UserError>>;

  /**
   * List all users. Used by admin pages (e.g., the admin users list,
   * the admin dashboard's "total students" stat). For a small admin
   * app this is fine; at scale, add a paginated list() method.
   */
  listAll(): Promise<Result<readonly User[], UserError>>;

  /**
   * Find a user by their email address.
   * Returns not_found if no user with that email exists.
   */
  findByEmail(email: string): Promise<Result<User, UserError>>;

  /**
   * Persist a new user.
   * Returns email_taken if a user with this email already exists.
   */
  create(params: {
    id: string;
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
  }): Promise<Result<User, UserError>>;

  /**
   * Update a user's profile fields.
   */
  update(
    id: string,
    patch: Partial<{
      firstName: string;
      lastName: string;
      avatarUrl: string;
      bio: string;
      /**
       * Replace the user's enrolled course IDs.
       * Use appendEnrolledCourseId() in EnrollStudent to append without overwriting.
       */
      enrolledCourseIds: readonly string[];
      /**
       * STORY-007: stamp the user's email as verified. Set by the
       * VerifyEmail use case after a successful token exchange.
       */
      emailVerifiedAt: Date | null;
      /**
       * STORY-008: replace the password hash. Set by the
       * ResetPassword use case after a successful token exchange.
       */
      passwordHash: string;
      /**
       * Audit hardening: flip once ConfirmTwoFactor validates the
       * pending secret, or DisableTwoFactor turns it off. Does not
       * touch the secret itself — use setTwoFactorSecret() for that.
       */
      twoFactorEnabled: boolean;
      /**
       * Whether this user is required to have 2FA enabled to access admin routes.
       */
      requires2FA: boolean;
      /**
       * Set by AdminGrantSubscription, an admin manually granting a
       * student STARTER/PRO access outside the checkout flow (e.g.
       * paid by bank transfer). Also usable to correct a mistaken grant
       * back to FREE.
       */
      subscriptionTier: SubscriptionTier;
    }>,
  ): Promise<Result<User, UserError>>;

  /**
   * Check if an email is already taken.
   */
  emailExists(email: string): Promise<Result<boolean, UserError>>;

  /**
   * Get the stored password hash for a user.
   * Used by Login to verify the password.
   * Returns not_found if the user does not exist.
   */
  getPasswordHash(userId: string): Promise<Result<string, UserError>>;

  /**
   * Update a user's total XP.
   * Called by AwardXP use case after persisting an XPEvent.
   */
  updateTotalXp(userId: string, newTotalXp: number): Promise<Result<User, UserError>>;

  /**
   * Get the stored TOTP secret for a user, or null if 2FA has never
   * been enrolled / has been disabled. Same narrow-accessor treatment
   * as getPasswordHash() — never exposed on the User entity itself.
   */
  getTwoFactorSecret(userId: string): Promise<Result<string | null, UserError>>;

  /**
   * Set (or clear, with null) the stored TOTP secret. EnableTwoFactor
   * sets a pending secret; DisableTwoFactor clears it. Does not touch
   * twoFactorEnabled — use update() for that.
   */
  setTwoFactorSecret(userId: string, secret: string | null): Promise<Result<void, UserError>>;

  /**
   * STORY-096: irreversibly scrub a user's PII and stamp deletedAt.
   * Overwrites email, firstName, lastName, phone, avatarUrl, bio, and
   * the password hash with anonymized placeholders; clears the TOTP
   * secret and disables 2FA. Does NOT touch or cascade-delete Order,
   * Enrollment, Certificate, or other financial/audit records — those
   * keep referencing this userId so tax and audit trails survive
   * account deletion, per docs/business-layer.md's receipt retention
   * rule. Callers are responsible for also revoking sessions
   * (SessionRepository.deleteAllForUser) — this method only touches
   * the User row itself.
   *
   * @param anonymizedEmail  Caller-supplied replacement email (must be
   *   unique — the use case derives it from the user's id so the
   *   original email becomes available for a fresh signup).
   */
  anonymizeAndDelete(userId: string, anonymizedEmail: string): Promise<Result<void, UserError>>;

  /**
   * Proposal 1 (account lockout): record the outcome of a login attempt.
   *
   * - `{ kind: "success" }` clears the failed-attempt streak and any
   *   active lockout (called by Login after a correct password).
   * - `{ kind: "failure" }` atomically increments the failed-attempt
   *   streak and, once it reaches `maxAttempts`, locks the account
   *   until `lockUntil` (called by Login after a wrong password). If a
   *   *previous* lockout has already expired as of `now`, the streak
   *   restarts at 1 instead of incrementing — otherwise the first
   *   wrong password after the lockout window passes would find the
   *   counter still sitting at `maxAttempts` and re-lock immediately,
   *   breaking the "N *consecutive* failures" contract.
   *
   * A single method (rather than separate get/increment/reset/lock
   * methods) keeps this port under the ISP method-count threshold
   * enforced by tests/architecture/port-segregation.test.ts — the
   * increment-then-maybe-lock comparison is trivial enough to live in
   * the adapter, while the actual policy (5 attempts / 15 minutes)
   * stays in the Login use case. Returns the resulting `lockedUntil` so
   * the caller can tell whether *this* attempt just tripped the lock.
   * The pre-attempt lockout check reads `User.lockedUntil` directly off
   * the entity already returned by findByEmail — no separate read here.
   */
  recordLoginAttempt(
    userId: string,
    outcome:
      { kind: "success" } | { kind: "failure"; maxAttempts: number; lockUntil: Date; now: Date },
  ): Promise<Result<{ lockedUntil: Date | null }, UserError>>;
}

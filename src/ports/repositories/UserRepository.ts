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
       * Set by AdminGrantSubscription — an admin manually granting a
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
}

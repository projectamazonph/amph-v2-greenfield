/**
 * UserRepository port — the interface for persisting and retrieving users.
 *
 * Defined in src/ports/ so the domain and use-case layers can depend on
 * this abstraction. The implementation lives in src/infra/repositories/.
 *
 * ADR-014: Every port method returns Result<T, E>. No exceptions across boundaries.
 */

import type { User } from "@/domain/entities/User";
import { Result } from "@/domain/shared/Result";

export type UserError =
  | { kind: "not_found" }
  | { kind: "email_taken" }
  | { kind: "db_error"; message: string };

export interface UserRepository {
  /**
   * Find a user by their unique ID.
   * Returns not_found if the ID does not exist.
   */
  findById(id: string): Promise<Result<User, UserError>>;

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
}

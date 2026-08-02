/**
 * User entity — the canonical representation of an AMPH student or instructor.
 *
 * This is a **domain object** — no framework annotations, no database mapping.
 * It lives in src/domain/ and is the most-imported module in the codebase.
 *
 * Business rules encoded here:
 * - Names must be non-empty
 * - Email format is validated at the use-case layer (not in the entity)
 * - Password hashing is the responsibility of the infrastructure layer
 * - Locked accounts cannot authenticate
 */

import { Result } from "@/domain/shared/Result";

export type Role = "STUDENT" | "INSTRUCTOR" | "ADMIN";
export type SubscriptionTier = "FREE" | "STARTER" | "PRO";
export type VerificationStatus = "UNVERIFIED" | "VERIFIED" | "SUSPENDED";

export interface User {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly role: Role;
  readonly subscriptionTier: SubscriptionTier;
  readonly verificationStatus: VerificationStatus;
  /**
   * @deprecated Proposal 8: this denormalized copy is no longer
   * written or read by application code — the `Enrollment` table
   * (`IEnrollmentRepository`) is the sole source of truth for course
   * access. Kept on the entity/schema for now (multi-step removal:
   * stop reading/writing first, drop the column in a later pass) so
   * this isn't a breaking schema change on its own. Do not add new
   * reads or writes of this field — use `IEnrollmentRepository`
   * instead.
   */
  readonly enrolledCourseIds: readonly string[];
  /**
   * Whether admin TOTP 2FA is active for this account. The secret
   * itself is never on this entity — same treatment as the password
   * hash — see UserRepository.getTwoFactorSecret()/setTwoFactorSecret().
   */
  readonly twoFactorEnabled: boolean;
  readonly createdAt: Date;
  /** Total XP earned by the user (mutable, updated via XPService). */
  totalXp: number;
  /**
   * STORY-007: timestamp of when the user verified their email.
   * Null until they click the verification link. The presence
   * of this field is the source of truth for "is the user's
   * email verified"; the `verificationStatus` field may be
   * derived from it.
   */
  readonly emailVerifiedAt: Date | null;
  /**
   * Proposal 1 (account lockout): set once a consecutive-failed-login
   * streak crosses the threshold; cleared on the next successful
   * login. Optional so existing call sites that build a `User` literal
   * directly (mocks, fixtures) don't need updating — absence means
   * "not locked", same as `null`. See UserRepository.recordLoginAttempt().
   */
  readonly lockedUntil?: Date | null;
}

export interface CreateUserParams {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  enrolledCourseIds?: readonly string[];
}

/** Domain-only constructor — creates a User from raw fields. */
export function createUser(params: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role?: Role;
  subscriptionTier?: SubscriptionTier;
  verificationStatus?: VerificationStatus;
  enrolledCourseIds?: readonly string[];
  twoFactorEnabled?: boolean;
  createdAt?: Date;
  totalXp?: number;
  emailVerifiedAt?: Date | null;
  lockedUntil?: Date | null;
}): Result<User, { kind: "invalid_input"; message: string }> {
  if (!params.firstName.trim()) {
    return Result.err({ kind: "invalid_input", message: "First name is required." });
  }
  if (!params.lastName.trim()) {
    return Result.err({ kind: "invalid_input", message: "Last name is required." });
  }

  return Result.ok(
    Object.freeze({
      id: params.id,
      email: params.email.toLowerCase().trim(),
      firstName: params.firstName.trim(),
      lastName: params.lastName.trim(),
      role: params.role ?? "STUDENT",
      subscriptionTier: params.subscriptionTier ?? "FREE",
      verificationStatus: params.verificationStatus ?? "UNVERIFIED",
      enrolledCourseIds: Object.freeze([...(params.enrolledCourseIds ?? [])]),
      twoFactorEnabled: params.twoFactorEnabled ?? false,
      createdAt: params.createdAt ?? new Date(),
      totalXp: params.totalXp ?? 0,
      emailVerifiedAt: params.emailVerifiedAt ?? null,
      lockedUntil: params.lockedUntil ?? null,
    }),
  );
}

/** Full name */
export function userFullName(user: User): string {
  return `${user.firstName} ${user.lastName}`;
}

/** Initials for avatar */
export function userInitials(user: User): string {
  return `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();
}

/** Is the user an admin? */
export function isAdmin(user: User): boolean {
  return user.role === "ADMIN";
}

/** Is the user an instructor? */
export function isInstructor(user: User): boolean {
  return user.role === "INSTRUCTOR" || user.role === "ADMIN";
}

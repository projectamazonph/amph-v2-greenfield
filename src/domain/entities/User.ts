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
  /** Course IDs the user has directly enrolled in (paid or granted). */
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
   * STORY-051: session revocation counter.
   * Every time an admin revokes all sessions for this user, this
   * value is incremented. The JWT embeds the sessionVersion at the
   * time of login; `getSessionUserId` rejects any token whose
   * embedded version does not match the current value.
   */
  readonly currentSessionVersion: number;
  /**
   * STORY-051: temporary account lockout.
   * If set to a future timestamp, the user cannot authenticate.
   * Set by the lockout policy (e.g. after too many failed logins).
   */
  readonly lockedUntil: Date | null;
}

export interface CreateUserParams {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  enrolledCourseIds?: readonly string[];
  currentSessionVersion?: number;
  lockedUntil?: Date | null;
}

/** Domain-only constructor — creates a User from raw fields. */
export function createUser({
  id,
  email,
  firstName,
  lastName,
  role,
  subscriptionTier,
  verificationStatus,
  enrolledCourseIds,
  twoFactorEnabled,
  createdAt,
  totalXp,
  emailVerifiedAt,
  currentSessionVersion,
  lockedUntil,
}: {
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
  currentSessionVersion?: number;
  lockedUntil?: Date | null;
}): Result<User, { kind: "invalid_input"; message: string }> {
  if (!firstName.trim()) {
    return Result.err({ kind: "invalid_input", message: "First name is required." });
  }
  if (!lastName.trim()) {
    return Result.err({ kind: "invalid_input", message: "Last name is required." });
  }

  return Result.ok(
    Object.freeze({
      id,
      email: email.toLowerCase().trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role: role ?? "STUDENT",
      subscriptionTier: subscriptionTier ?? "FREE",
      verificationStatus: verificationStatus ?? "UNVERIFIED",
      enrolledCourseIds: Object.freeze([...(enrolledCourseIds ?? [])]),
      twoFactorEnabled: twoFactorEnabled ?? false,
      createdAt: createdAt ?? new Date(),
      totalXp: totalXp ?? 0,
      emailVerifiedAt: emailVerifiedAt ?? null,
      currentSessionVersion: currentSessionVersion ?? 0,
      lockedUntil: lockedUntil ?? null,
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

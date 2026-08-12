/**
 * AdminGrantSubscription: admin manually grants a student a
 * subscription tier (STARTER/PRO) outside the checkout flow.
 *
 * For students who paid outside the platform (bank transfer, GCash
 * sent directly, cash) rather than through PayMongo. Finds the
 * student by email, creating a placeholder account if none exists,
 * sets `subscriptionTier` directly, and optionally records how the
 * student paid for bookkeeping (method, amount, free-text reference)
 * as AuditLog metadata. No Order row is created, since Order is
 * scoped to a single course purchase and this grant is tier-wide.
 *
 * New accounts get no usable password (a random hash they can never
 * enter). Reuses RequestPasswordReset to mint a "set your password"
 * email, exactly like the public forgot-password flow, so the
 * account isn't left unreachable.
 *
 * After the tier is set, the use case auto-enrolls the student in
 * every published course their new tier unlocks (STARTER grants
 * unlock STARTER + PREVIEW courses, PRO grants unlock everything).
 * Without this step the student's dashboard "My courses" section is
 * empty (it reads from the Enrollment table, not the user's tier
 * field), even though TierAccessPolicy would let them in by URL.
 * TierAccessPolicy still does the access check on lesson views; this
 * step just makes the dashboard, progress tracking, and "continue
 * learning" surfaces work for the granted tier.
 *
 * The auto-enroll step is idempotent (re-granting the same tier
 * returns "already_enrolled" for each course, which we treat as
 * success) and best-effort for non-conflict errors — if one course
 * fails to enroll for an unexpected reason, the grant itself still
 * stands and the failure is logged. A downgrade to FREE skips
 * auto-enrollment entirely (revocation, not new access; existing
 * enrollments are left intact).
 */

import { Result } from "@/domain/shared/Result";
import type { Money } from "@/domain/values/Money";
import { subscriptionMeetsCourseTier } from "@/domain/values/CourseAccessTier";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import type { CourseRepository } from "@/ports/repositories/CourseRepository";
import type { PasswordHasher } from "@/ports/security/PasswordHasher";
import type { IdGenerator } from "@/ports/system/IdGenerator";
import type { Logger } from "@/ports/observability/Logger";
import type { RecordAuditLog } from "@/usecases/RecordAuditLog";
import type { RequestPasswordReset } from "@/usecases/auth/RequestPasswordReset";
import type { EnrollStudent } from "@/usecases/EnrollStudent";
import type { SubscriptionTier } from "@/domain/entities/User";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface AdminGrantSubscriptionPaymentInput {
  /** Free-text payment method, e.g. "GCash", "Bank transfer", "Cash". */
  method: string;
  /** Amount actually received. */
  amount: Money;
  /** Free-text reference for bookkeeping, e.g. a GCash ref # or receipt note. */
  reference?: string;
}

export interface AdminGrantSubscriptionInput {
  email: string;
  /** Required only when the student has no account yet. */
  firstName?: string;
  /** Required only when the student has no account yet. */
  lastName?: string;
  subscriptionTier: SubscriptionTier;
  actorId: string;
  /** Omit for comp/free grants. No payment is recorded. */
  payment?: AdminGrantSubscriptionPaymentInput;
}

export type AdminGrantSubscriptionError =
  | { kind: "invalid_email" }
  | { kind: "invalid_name"; field: "firstName" | "lastName" }
  | { kind: "db_error"; message: string };

export interface AdminGrantSubscriptionOutput {
  userId: string;
  isNewUser: boolean;
  subscriptionTier: SubscriptionTier;
}

export type AdminGrantSubscriptionResult = Result<
  AdminGrantSubscriptionOutput,
  AdminGrantSubscriptionError
>;

export interface AdminGrantSubscriptionDeps {
  userRepo: UserRepository;
  courseRepo: CourseRepository;
  idGen: IdGenerator;
  passwordHasher: PasswordHasher;
  recordAuditLog: RecordAuditLog;
  /** Reused (not duplicated) to send new accounts a "set your password" email. */
  requestPasswordReset: RequestPasswordReset;
  /** Reused to auto-enroll the student in every course the granted tier unlocks. */
  enrollStudent: EnrollStudent;
  logger: Logger;
}

export class AdminGrantSubscription {
  constructor(private readonly deps: AdminGrantSubscriptionDeps) {}

  async execute(input: AdminGrantSubscriptionInput): Promise<AdminGrantSubscriptionResult> {
    const email = input.email.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      return Result.err({ kind: "invalid_email" });
    }

    const existingResult = await this.deps.userRepo.findByEmail(email);

    let userId: string;
    let isNewUser: boolean;
    let previousTier: SubscriptionTier | null;

    if (existingResult.ok) {
      userId = existingResult.value.id;
      isNewUser = false;
      previousTier = existingResult.value.subscriptionTier;
    } else if (existingResult.error.kind === "db_error") {
      return Result.err({ kind: "db_error", message: existingResult.error.message });
    } else {
      const firstName = input.firstName?.trim();
      if (!firstName) {
        return Result.err({ kind: "invalid_name", field: "firstName" });
      }
      const lastName = input.lastName?.trim();
      if (!lastName) {
        return Result.err({ kind: "invalid_name", field: "lastName" });
      }

      // Throwaway placeholder hash: the account can't be logged into with
      // it, and it's immediately superseded by the password-reset flow
      // below, so a sortable ULID from the injected IdGenerator is fine
      // here (no need for a separate cryptographic-randomness port).
      const hashResult = await this.deps.passwordHasher.hash(this.deps.idGen.newId());
      if (!hashResult.ok) {
        return Result.err({ kind: "db_error", message: "Failed to provision account." });
      }

      const createResult = await this.deps.userRepo.create({
        id: this.deps.idGen.newId(),
        email,
        passwordHash: hashResult.value,
        firstName,
        lastName,
      });

      if (createResult.ok) {
        userId = createResult.value.id;
        isNewUser = true;
        previousTier = null;
      } else if (createResult.error.kind === "email_taken") {
        // Race: another request created this user between findByEmail and
        // create() above. Treat it like the "existing user" path.
        const raceResult = await this.deps.userRepo.findByEmail(email);
        if (!raceResult.ok) {
          return Result.err({ kind: "db_error", message: "email_taken but lookup failed" });
        }
        userId = raceResult.value.id;
        isNewUser = false;
        previousTier = raceResult.value.subscriptionTier;
      } else {
        const message =
          createResult.error.kind === "db_error"
            ? createResult.error.message
            : createResult.error.kind;
        return Result.err({ kind: "db_error", message });
      }
    }

    const updateResult = await this.deps.userRepo.update(userId, {
      subscriptionTier: input.subscriptionTier,
    });
    if (!updateResult.ok) {
      const message =
        updateResult.error.kind === "db_error"
          ? updateResult.error.message
          : updateResult.error.kind;
      return Result.err({ kind: "db_error", message });
    }

    // Auto-enroll the student in every published course the granted tier
    // unlocks. Skipped for FREE because that's a revocation, not new
    // access. `already_enrolled` is the expected outcome on re-grant and
    // on courses the student already bought individually — counted as
    // success. Other errors are logged but don't fail the grant: the
    // tier is already set and audited below.
    const enrolledCourseIds = await this.autoEnrollAtTier(userId, input.subscriptionTier);

    await this.deps.recordAuditLog.execute({
      actorId: input.actorId,
      action: isNewUser ? "user.subscription_granted" : "user.subscription_changed",
      targetType: "user",
      targetId: userId,
      metadata: {
        subscriptionTier: input.subscriptionTier,
        previousTier,
        isNewUser,
        enrolledCourseIds,
        ...(input.payment
          ? {
              paymentMethod: input.payment.method,
              paymentAmountMinor: input.payment.amount.toMinor(),
              paymentReference: input.payment.reference,
            }
          : {}),
      },
    });

    if (isNewUser) {
      // Best-effort: the grant itself already succeeded and was audited
      // above. A failure to send the claim email shouldn't undo the
      // grant. Logged so an admin can notice and trigger "forgot
      // password" for the student manually if this silently fails.
      const resetResult = await this.deps.requestPasswordReset.execute({
        email,
        ip: "admin-grant",
      });
      if (!resetResult.ok) {
        this.deps.logger.warn("admin_grant_subscription.claim_email_failed", {
          userId,
          error: resetResult.error,
        });
      }
    }

    return Result.ok({ userId, isNewUser, subscriptionTier: input.subscriptionTier });
  }

  /**
   * Enroll the user in every published course the granted tier unlocks.
   * Returns the list of course IDs that ended up with a fresh enrollment
   * OR an "already_enrolled" result (so the audit metadata reflects the
   * full set of courses the grant covers, not just the new ones).
   *
   * FREE grants are a no-op — downgrading shouldn't create new rows.
   * Individual enroll errors are logged at warn and swallowed: the
   * grant itself has already succeeded, and a flaky course shouldn't
   * undo the subscription for the rest of the catalog.
   */
  private async autoEnrollAtTier(
    userId: string,
    tier: SubscriptionTier,
  ): Promise<readonly string[]> {
    if (tier === "FREE") return [];

    const coursesResult = await this.deps.courseRepo.listPublished();
    if (!coursesResult.ok) {
      this.deps.logger.warn("admin_grant_subscription.course_list_failed", {
        userId,
        error: coursesResult.error,
      });
      return [];
    }

    const eligible = coursesResult.value.filter((c) =>
      subscriptionMeetsCourseTier(tier, c.courseTier),
    );

    const enrolled: string[] = [];
    for (const course of eligible) {
      const result = await this.deps.enrollStudent.execute({
        userId,
        courseId: course.id,
        entitlement: "admin_grant",
      });

      if (result.ok || result.error.kind === "already_enrolled") {
        enrolled.push(course.id);
        continue;
      }

      this.deps.logger.warn("admin_grant_subscription.auto_enroll_failed", {
        userId,
        courseId: course.id,
        courseSlug: course.slug,
        error: result.error,
      });
    }
    return enrolled;
  }
}

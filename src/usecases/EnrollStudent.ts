/**
 * EnrollStudent — grant a student full access to a course.
 *
 * STORY-023: EnrollStudent use case.
 * P0-1 fix: paywall enforcement.
 *
 * Called by the PayMongo webhook handler when a payment succeeds,
 * by the manual-enroll action (admin grant path only), or — for
 * genuinely free courses — by the public enrollment action.
 *
 * The paywall: paid courses (price.minor > 0) require one of:
 *   - `entitlement: "order"`      — a PAID order exists for (user, course)
 *   - `entitlement: "admin_grant"`— caller is a trusted admin path
 *
 * Free courses (price.minor === 0) accept any entitlement.
 *
 * Steps:
 *  1. Validate user exists
 *  2. Check user is not already enrolled (pre-check on User.enrolledCourseIds)
 *  3. Validate course exists and is PUBLISHED
 *  4. **P0-1: paywall check** — if course is paid, require order or admin_grant
 *  5. Check no Enrollment record exists (DB uniqueness)
 *  6. Create Enrollment record
 *  7. Append courseId to User.enrolledCourseIds
 *  8. Return the Enrollment
 *
 * Fail Fast: returns typed errors early before touching persistence.
 */

import { Result } from "@/domain/shared/Result";
import { createEnrollment } from "@/domain/entities/Enrollment";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import type { CourseRepository } from "@/ports/repositories/CourseRepository";
import type { IEnrollmentRepository } from "@/ports/repositories/IEnrollmentRepository";
import type { IOrderRepository } from "@/ports/repositories/OrderRepository";
import type { Enrollment } from "@/domain/entities/Enrollment";

/** P0-1: how did the caller earn the right to enroll? */
export type EntitlementSource = "free" | "order" | "admin_grant";

export interface EnrollStudentInput {
  userId: string;
  courseId: string;
  /** P0-1: required. Caller must declare how this enrollment is entitled. */
  entitlement: EntitlementSource;
  source?: "direct" | "affiliate" | "simulator_trial";
  couponCode?: string | null;
  couponDiscount?: number | null;
}

export type EnrollStudentError =
  | { kind: "user_not_found" }
  | { kind: "course_not_found" }
  | { kind: "course_not_published" }
  | { kind: "already_enrolled" }
  | { kind: "paid_no_entitlement" };

export type EnrollStudentResult = Result<
  Enrollment,
  EnrollStudentError
>;

/** Minimal ID generator interface — EnrollStudent only needs newId(). */
export type IdGen = { newId(): string };

export interface EnrollStudentDeps {
  userRepo: UserRepository;
  courseRepo: CourseRepository;
  enrollmentRepo: IEnrollmentRepository;
  /** P0-1: required to verify order-based entitlement. */
  orderRepo: IOrderRepository;
  idGen: IdGen;
}

export class EnrollStudent {
  constructor(private readonly deps: EnrollStudentDeps) {}

  async execute(input: EnrollStudentInput): Promise<EnrollStudentResult> {
    const { userRepo, courseRepo, enrollmentRepo, orderRepo, idGen } = this.deps;

    // ── 1. User must exist ───────────────────────────────────
    const userResult = await userRepo.findById(input.userId);
    if (Result.isErr(userResult)) {
      return Result.err({ kind: "user_not_found" });
    }
    const user = userResult.value;

    // ── Pre-check: already enrolled via User.enrolledCourseIds ─
    if (user.enrolledCourseIds.includes(input.courseId)) {
      return Result.err({ kind: "already_enrolled" });
    }

    // ── 2. Course must exist and be PUBLISHED ───────────────
    const courseResult = await courseRepo.findById(input.courseId);
    if (Result.isErr(courseResult)) {
      return Result.err({ kind: "course_not_found" });
    }
    const course = courseResult.value;
    if (course.status !== "PUBLISHED") {
      return Result.err({ kind: "course_not_published" });
    }

    // ── 3. P0-1: paywall enforcement ─────────────────────────
    //    The server decides based on the course's authoritative price.
    //    The client's `isFree` flag (if any) is ignored.
    const isFree = course.price.minor === 0;
    if (!isFree) {
      if (input.entitlement === "admin_grant") {
        // Trusted path: server-side admin action. No order check.
      } else if (input.entitlement === "order") {
        const paidOrderResult = await orderRepo.findPaidForUserAndCourse(
          input.userId,
          input.courseId,
        );
        if (Result.isErr(paidOrderResult)) {
          return Result.err({ kind: "user_not_found" }); // closest error; treat repo error as "not found" defensively
        }
        if (paidOrderResult.value === null) {
          return Result.err({ kind: "paid_no_entitlement" });
        }
      } else {
        // entitlement is "free" for a paid course, or some unknown value.
        return Result.err({ kind: "paid_no_entitlement" });
      }
    }
    // Free courses: any entitlement is allowed.

    // ── 4. DB-level uniqueness check ─────────────────────────
    const existing = await enrollmentRepo.findByUserIdAndCourseId(
      input.userId,
      input.courseId,
    );
    if (existing !== null) {
      return Result.err({ kind: "already_enrolled" });
    }

    // ── 5. Create Enrollment ─────────────────────────────────
    const enrollmentResult = createEnrollment({
      id: idGen.newId(),
      userId: input.userId,
      courseId: input.courseId,
      source: input.source ?? "direct",
      couponCode: input.couponCode,
      couponDiscount: input.couponDiscount,
    });
    if (Result.isErr(enrollmentResult)) {
      // Should never happen given inputs, but handle defensively
      return Result.err({ kind: "user_not_found" }); // closest error
    }
    const enrollment = enrollmentResult.value;

    // ── 6. Persist enrollment ────────────────────────────────
    const persistedResult = await enrollmentRepo.create(enrollment);
    if (Result.isErr(persistedResult)) {
      // already_enrolled race condition — return the typed error
      if (persistedResult.error.kind === "already_enrolled") {
        return Result.err({ kind: "already_enrolled" });
      }
      return Result.err({ kind: "user_not_found" }); // closest error
    }

    // ── 7. Update User.enrolledCourseIds ────────────────────
    const updatedUserResult = await userRepo.update(input.userId, {
      enrolledCourseIds: [...user.enrolledCourseIds, input.courseId],
    });
    if (Result.isErr(updatedUserResult)) {
      // Non-fatal: enrollment is persisted; access policy will still grant access
      // Log here in production. For now, continue.
    }

    // ── 8. Return enrollment ─────────────────────────────────
    return Result.ok(enrollment);
  }
}

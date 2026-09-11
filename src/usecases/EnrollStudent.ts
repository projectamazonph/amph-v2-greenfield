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
 * P1-01: course prerequisites gate every entitlement except
 * `admin_grant` (deliberate admin override — manual grants and the
 * subscription auto-enroll keep working unchanged and are already
 * audited as `enrollment.granted`). A gated enrollment fails with
 * `prerequisite_not_met`, naming the first unmet requirement.
 *
 * Steps:
 *  1. Validate user exists
 *  2. Validate course exists and is PUBLISHED
 *  3. **P0-1: paywall check** — if course is paid, require order or admin_grant
 *  3b. **P1-01: prerequisite check** — non-admin entitlements need every
 *      rule on the course satisfied (required course complete, or the
 *      required lesson complete)
 *  4. Check no Enrollment record exists (DB uniqueness, also serves as
 *     the "already enrolled" check)
 *  5. Build the Enrollment record
 *  6. Persist it
 *  7. Return the Enrollment
 *
 * Fail Fast: returns typed errors early before touching persistence.
 *
 * Proposal 8: this used to also append courseId to
 * User.enrolledCourseIds as a denormalized copy, which
 * TierAccessPolicy read directly for access checks. That created a
 * dual-source-of-truth risk — if the User.update() write failed after
 * the Enrollment row was already committed, the user would have a
 * real Enrollment but no access, silently. Enrollment is now the only
 * source of truth; TierAccessPolicy queries it directly.
 */

import { Result } from "@/domain/shared/Result";
import { createEnrollment } from "@/domain/entities/Enrollment";
import {
  isCourseComplete,
  type Prerequisite,
} from "@/domain/entities/Prerequisite";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import type { CourseRepository } from "@/ports/repositories/CourseRepository";
import type { IEnrollmentRepository } from "@/ports/repositories/IEnrollmentRepository";
import type { IPrerequisiteRepository } from "@/ports/repositories/IPrerequisiteRepository";
import type { IOrderRepository } from "@/ports/repositories/OrderRepository";
import type { Enrollment } from "@/domain/entities/Enrollment";
import type { EnrollmentSource } from "@/domain/entities/Enrollment";
import { subscriptionMeetsCourseTier } from "@/domain/values/CourseAccessTier";

/** P0-1: how did the caller earn the right to enroll? */
export type EntitlementSource = "free" | "order" | "admin_grant" | "subscription";

export interface EnrollStudentInput {
  userId: string;
  courseId: string;
  /** P0-1: required. Caller must declare how this enrollment is entitled. */
  entitlement: EntitlementSource;
  source?: EnrollmentSource;
  couponCode?: string | null;
  couponDiscount?: number | null;
}

export type EnrollStudentError =
  | { kind: "user_not_found" }
  | { kind: "course_not_found" }
  | { kind: "course_not_published" }
  | { kind: "already_enrolled" }
  | { kind: "paid_no_entitlement" }
  | {
      kind: "prerequisite_not_met";
      requiresCourseId: string;
      requiresLessonId: string | null;
    }
  | { kind: "db_error"; message: string };

export type EnrollStudentResult = Result<Enrollment, EnrollStudentError>;

/** Minimal ID generator interface — EnrollStudent only needs newId(). */
export type IdGen = { newId(): string };

export interface EnrollStudentDeps {
  userRepo: UserRepository;
  courseRepo: CourseRepository;
  enrollmentRepo: IEnrollmentRepository;
  /** P0-1: required to verify order-based entitlement. */
  orderRepo: IOrderRepository;
  /** P1-01: required to enforce course prerequisites. */
  prerequisiteRepo: IPrerequisiteRepository;
  idGen: IdGen;
}

export class EnrollStudent {
  constructor(private readonly deps: EnrollStudentDeps) {}

  async execute(input: EnrollStudentInput): Promise<EnrollStudentResult> {
    const { userRepo, courseRepo, enrollmentRepo, orderRepo, prerequisiteRepo, idGen } = this.deps;

    // ── 1. User must exist ───────────────────────────────────
    const userResult = await userRepo.findById(input.userId);
    if (Result.isErr(userResult)) {
      return Result.err({ kind: "user_not_found" });
    }
    const user = userResult.value;

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
      } else if (input.entitlement === "subscription") {
        if (!subscriptionMeetsCourseTier(user.subscriptionTier, course.courseTier)) {
          return Result.err({ kind: "paid_no_entitlement" });
        }
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

    // ── 3b. P1-01: prerequisite check ──────────────────────
    //    Admin grants override gating (audited admin action). Every
    //    other entitlement must satisfy each live rule on the course.
    //    Fail closed: a rule we cannot evaluate blocks enrollment.
    if (input.entitlement !== "admin_grant") {
      const gate = await this.checkPrerequisites(
        prerequisiteRepo,
        courseRepo,
        enrollmentRepo,
        input.userId,
        input.courseId,
      );
      if (!gate.ok) {
        return Result.err({ kind: "db_error", message: gate.error.message });
      }
      if (gate.value !== null) {
        return Result.err({
          kind: "prerequisite_not_met",
          requiresCourseId: gate.value.requiresCourseId,
          requiresLessonId: gate.value.requiresLessonId,
        });
      }
    }

    // ── 4. DB-level uniqueness check ─────────────────────────
    const existing = await enrollmentRepo.findByUserIdAndCourseId(input.userId, input.courseId);
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

    // ── 7. Return enrollment ─────────────────────────────────
    return Result.ok(enrollment);
  }

  /**
   * P1-01: first unmet rule on the course, or null when every rule is
   * satisfied. Completion comes from active enrollments only — a
   * refunded or cancelled enrollment no longer proves anything.
   * Lesson-scoped rules check the completed-lesson union; course-scoped
   * rules load only the required course's curriculum and require every
   * lesson in it to be complete.
   */
  private async checkPrerequisites(
    prerequisiteRepo: IPrerequisiteRepository,
    courseRepo: CourseRepository,
    enrollmentRepo: IEnrollmentRepository,
    userId: string,
    courseId: string,
  ): Promise<Result<Prerequisite | null, { message: string }>> {
    const rules = await prerequisiteRepo.listByCourseId(courseId);
    if (!rules.ok) {
      const detail = rules.error.kind === "db_error" ? rules.error.message : rules.error.kind;
      return Result.err({ message: detail });
    }
    if (rules.value.length === 0) return Result.ok(null);

    const enrollmentsResult = await enrollmentRepo.findByUserId(userId);
    if (!enrollmentsResult.ok) {
      const detail =
        enrollmentsResult.error.kind === "db_error"
          ? enrollmentsResult.error.message
          : enrollmentsResult.error.kind;
      return Result.err({ message: detail });
    }
    const active = enrollmentsResult.value.filter((e) => e.status === "active");
    const byCourseId = new Map(active.map((e) => [e.courseId, e]));

    const lessonRules = rules.value.filter((rule) => rule.requiresLessonId !== null);
    if (lessonRules.length > 0) {
      const completedLessonIds = new Set<string>();
      for (const enrollment of active) {
        for (const lessonId of enrollment.completedLessonIds) {
          completedLessonIds.add(lessonId);
        }
      }
      for (const rule of lessonRules) {
        if (!completedLessonIds.has(rule.requiresLessonId as string)) {
          return Result.ok(rule);
        }
      }
    }

    const checkedCourses = new Map<string, boolean>();
    for (const rule of rules.value) {
      if (rule.requiresLessonId !== null) continue;
      let complete: boolean | undefined = checkedCourses.get(rule.requiresCourseId);
      if (complete === undefined) {
        const evaluated = await this.isRequiredCourseComplete(
          courseRepo,
          byCourseId.get(rule.requiresCourseId)?.completedLessonIds,
          rule.requiresCourseId,
        );
        if (!evaluated.ok) return Result.err(evaluated.error);
        complete = evaluated.value;
        checkedCourses.set(rule.requiresCourseId, complete);
      }
      if (!complete) return Result.ok(rule);
    }
    return Result.ok(null);
  }

  /**
   * True when the user holds an active enrollment in the required course
   * and every lesson in that course's curriculum is complete.
   */
  private async isRequiredCourseComplete(
    courseRepo: CourseRepository,
    completedLessonIds: readonly string[] | undefined,
    requiresCourseId: string,
  ): Promise<Result<boolean, { message: string }>> {
    if (completedLessonIds === undefined) return Result.ok(false);
    const courseResult = await courseRepo.findById(requiresCourseId);
    if (!courseResult.ok) {
      return Result.err({ message: `required course lookup failed: ${requiresCourseId}` });
    }
    const allLessonIds = courseResult.value.curriculum.sections.flatMap((section) =>
      section.lessons.map((lesson) => lesson.id),
    );
    return Result.ok(isCourseComplete(allLessonIds, completedLessonIds));
  }
}

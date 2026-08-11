/**
 * TierAccessPolicy — the production IAccessPolicy implementation.
 *
 * STORY-022: AccessPolicy port + TierAccessPolicy implementation.
 *
 * Access is granted in this priority:
 *  1. Enrolled in the course         → ALLOWED
 *  2. Course is PREVIEW tier         → ALLOWED_PREVIEW (anyone can preview)
 *  3. Subscription meets course tier → ALLOWED
 *  4. Subscription below course tier → DENIED_TIER
 */

import type { IAccessPolicy } from "@/ports/access/IAccessPolicy";
import type { AccessDecision } from "@/domain/values/AccessDecision";
import { subscriptionMeetsCourseTier } from "@/domain/values/CourseAccessTier";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import type { CourseRepository } from "@/ports/repositories/CourseRepository";
import type { IEnrollmentRepository } from "@/ports/repositories/IEnrollmentRepository";

export class TierAccessPolicy implements IAccessPolicy {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly courseRepo: CourseRepository,
    // Proposal 8: the Enrollment table is the source of truth for "is
    // this user enrolled in this course" — User.enrolledCourseIds was
    // a denormalized copy that could silently drift from it (e.g. if
    // the User.update() write in EnrollStudent failed after the
    // Enrollment row was already committed). Access control now reads
    // Enrollment directly instead of the copy.
    private readonly enrollmentRepo: IEnrollmentRepository,
  ) {}

  async canAccess(userId: string, courseId: string): Promise<AccessDecision> {
    // Anonymous → always denied
    if (!userId) {
      return { kind: "denied_not_authenticated" };
    }

    // Load user
    const userResult = await this.userRepo.findById(userId);
    if (!userResult.ok) {
      return { kind: "denied_not_authenticated" };
    }
    const user = userResult.value;

    // Load course
    const courseResult = await this.courseRepo.findById(courseId);
    if (!courseResult.ok || courseResult.value.status !== "PUBLISHED") {
      return { kind: "denied_not_authenticated" };
    }
    const course = courseResult.value;

    if (user.role === "ADMIN") {
      return { kind: "allowed" };
    }

    // Rule 1: enrolled → always full access
    //
    // IEnrollmentRepository.findByUserIdAndCourseId() has no Result
    // error channel, and PrismaEnrollmentRepository's underlying
    // findUnique() call isn't itself wrapped in a try/catch (only its
    // row-mapping step is) — so a transient DB error here would throw
    // uncaught into this access check. Fail closed the same way the
    // user/course lookups above already do, rather than letting a
    // transient DB error surface as an unhandled 500.
    let enrollment: Awaited<ReturnType<typeof this.enrollmentRepo.findByUserIdAndCourseId>>;
    try {
      enrollment = await this.enrollmentRepo.findByUserIdAndCourseId(userId, courseId);
    } catch {
      return { kind: "denied_not_authenticated" };
    }
    if (enrollment?.status === "active") {
      return { kind: "allowed" };
    }

    // Rule 2: PREVIEW tier → anyone can preview (regardless of subscription)
    if (course.courseTier === "PREVIEW") {
      return { kind: "allowed_preview", previewLessonCount: course.previewLessonCount };
    }

    // Rule 3: subscription satisfies course tier → full access
    const meetsTier = subscriptionMeetsCourseTier(user.subscriptionTier, course.courseTier);
    if (meetsTier) {
      return { kind: "allowed" };
    }

    // Rule 4: subscription below course tier → denied
    return {
      kind: "denied_tier",
      userTier: user.subscriptionTier,
      requiredTier: course.courseTier,
    };
  }
}

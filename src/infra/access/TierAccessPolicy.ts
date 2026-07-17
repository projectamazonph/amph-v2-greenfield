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

export class TierAccessPolicy implements IAccessPolicy {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly courseRepo: CourseRepository,
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

    // Rule 1: enrolled → always full access
    if (user.enrolledCourseIds.includes(courseId)) {
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

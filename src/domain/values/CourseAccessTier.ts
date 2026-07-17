/**
 * CourseAccessTier — the access level a course requires.
 *
 * STORY-022: AccessPolicy port + TierAccessPolicy implementation.
 *
 * Ordered: PREVIEW < STARTER < PRO
 * - PREVIEW: any logged-in user can view the preview (first N lessons)
 * - STARTER: STARTER or PRO subscription, OR direct enrollment
 * - PRO: PRO subscription only, OR direct enrollment
 */

import type { SubscriptionTier } from "@/domain/entities/User";

export type CourseAccessTier = "STARTER" | "PRO" | "PREVIEW";

/** All known course access tiers, ordered by privilege level. */
export const COURSE_ACCESS_TIERS = ["STARTER", "PRO", "PREVIEW"] as const;

/**
 * Does a user's subscription tier grant full access to a course at the given tier?
 *
 * Hierarchical: PRO ≥ STARTER ≥ PREVIEW
 * - PRO → satisfies PRO, STARTER, PREVIEW (any tier)
 * - STARTER → satisfies STARTER, PREVIEW (not PRO)
 * - FREE → satisfies PREVIEW only (free preview access)
 *
 * NOTE: For PREVIEW courses, callers should additionally check
 *       `courseTier === "PREVIEW"` to grant `allowed_preview`
 *       regardless of this result.
 */
export function subscriptionMeetsCourseTier(
  subscriptionTier: SubscriptionTier,
  courseTier: CourseAccessTier,
): boolean {
  if (subscriptionTier === "PRO") return true; // PRO satisfies any tier
  if (subscriptionTier === "STARTER") {
    return courseTier === "STARTER" || courseTier === "PREVIEW";
  }
  // FREE satisfies PREVIEW only (free preview access)
  return courseTier === "PREVIEW";
}

/**
 * AccessDecision — the result of checking whether a user can access a course.
 *
 * STORY-022: AccessPolicy port + TierAccessPolicy implementation.
 *
 * Variants:
 * - allowed                 → full access granted
 * - allowed_preview        → subscription too low for full access, preview available
 * - denied_tier            → subscription tier too low for this course
 * - denied_not_enrolled   → user has required tier but is not enrolled
 * - denied_not_authenticated → anonymous or user/course not found
 */

export type AccessDecision =
  | { readonly kind: "allowed" }
  | { readonly kind: "allowed_preview"; readonly previewLessonCount: number }
  | {
      readonly kind: "denied_tier";
      readonly userTier: string;
      readonly requiredTier: string;
    }
  | { readonly kind: "denied_not_enrolled" }
  | { readonly kind: "denied_not_authenticated" };

/** Full access or preview access (anything short of a hard denial). */
export function isAllowed(decision: AccessDecision): boolean {
  return decision.kind === "allowed" || decision.kind === "allowed_preview";
}

/** Any form of denial. */
export function isDenied(decision: AccessDecision): boolean {
  return !isAllowed(decision);
}

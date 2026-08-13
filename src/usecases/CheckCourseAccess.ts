/**
 * CheckCourseAccess — thin use-case shell for the IAccessPolicy port.
 *
 * STORY-022: AccessPolicy port + TierAccessPolicy implementation.
 *
 * This use case wraps IAccessPolicy and maps its decision to a Result.
 * No business logic lives here — it all lives in the policy implementation.
 */

import { Result } from "@/domain/shared/Result";
import type { IAccessPolicy } from "@/ports/access/IAccessPolicy";
import type { AccessDecision } from "@/domain/values/AccessDecision";

export type CheckCourseAccessResult = Result<
  AccessDecision,
  {
    kind: "access_denied";
    reason: "tier" | "not_enrolled" | "not_authenticated";
    tier: string | undefined;
    requiredTier: string | undefined;
  }
>;

export interface CheckCourseAccessParams {
  userId: string;
  courseId: string;
}

export class CheckCourseAccess {
  constructor(private readonly accessPolicy: IAccessPolicy) {}

  async execute(params: CheckCourseAccessParams): Promise<CheckCourseAccessResult> {
    const decision = await this.accessPolicy.canAccess(params.userId, params.courseId);

    if (decision.kind === "allowed" || decision.kind === "allowed_preview") {
      return Result.ok(decision);
    }

    if (decision.kind === "denied_tier") {
      return Result.err({
        kind: "access_denied",
        reason: "tier",
        tier: decision.userTier,
        requiredTier: decision.requiredTier,
      });
    }

    return Result.err({
      kind: "access_denied",
      reason:
        decision.kind === "denied_not_enrolled" ? "not_enrolled" : "not_authenticated",
      tier: undefined,
      requiredTier: undefined,
    });
  }
}

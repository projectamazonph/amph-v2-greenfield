/**
 * StubAccessPolicy — a deterministic test double for IAccessPolicy.
 *
 * STORY-022: AccessPolicy port + TierAccessPolicy implementation.
 *
 * Configure the next decision with `stubDecision` before each test.
 * Configure specific course overrides with `stubDecisions`.
 */

import type { IAccessPolicy } from "@/ports/access/IAccessPolicy";
import type { AccessDecision } from "@/domain/values/AccessDecision";

export class StubAccessPolicy implements IAccessPolicy {
  /**
   * The decision returned for any (userId, courseId) pair.
   * Override with `stubDecisions` for per-course control.
   */
  stubDecision: AccessDecision = { kind: "denied_not_authenticated" };

  /**
   * Per-course decision overrides. Keyed by `courseId`.
   * Checked before `stubDecision`.
   */
  stubDecisions: Record<string, AccessDecision> = {};

  async canAccess(userId: string, courseId: string): Promise<AccessDecision> {
    return this.stubDecisions[courseId] ?? this.stubDecision;
  }
}

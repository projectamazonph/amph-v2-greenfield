/**
 * IAccessPolicy — the port for answering "can this user access this course?"
 *
 * STORY-022: AccessPolicy port + TierAccessPolicy implementation.
 *
 * Implementations should NOT throw — always return a decision.
 */

import type { AccessDecision } from "@/domain/values/AccessDecision";

export interface IAccessPolicy {
  /**
   * Returns the access decision for a given user and course.
   *
   * @param userId  - the authenticated user's ID (empty string = anonymous)
   * @param courseId - the course being accessed
   */
  canAccess(userId: string, courseId: string): Promise<AccessDecision>;
}

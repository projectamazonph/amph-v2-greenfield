/**
 * IAttemptFeedbackRepository — port for persisting and retrieving AttemptFeedback.
 *
 * STORY-066: Feedback Composer + Remediation Recommendations.
 */

import { Result } from "@/domain/shared/Result";
import type { AttemptFeedback } from "@/domain/entities/AttemptFeedback";

export type AttemptFeedbackError = { kind: "db_error"; message: string };

export interface IAttemptFeedbackRepository {
  /**
   * Persist a newly composed AttemptFeedback.
   * Fails with db_error if the attemptId already exists (unique constraint).
   */
  create(feedback: AttemptFeedback): Promise<Result<void, AttemptFeedbackError>>;

  /**
   * Retrieve feedback for a specific attemptId.
   * Returns null if no feedback exists for that attempt.
   */
  findByAttemptId(attemptId: string): Promise<Result<AttemptFeedback | null, AttemptFeedbackError>>;

  /**
   * Retrieve all feedback records for a user, newest first.
   * @param userId - the user to query
   * @param limit - optional maximum number of records to return
   */
  findByUserId(
    userId: string,
    limit?: number,
  ): Promise<Result<readonly AttemptFeedback[], AttemptFeedbackError>>;
}

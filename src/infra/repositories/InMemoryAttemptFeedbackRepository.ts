/**
 * InMemoryAttemptFeedbackRepository — in-memory adapter for AttemptFeedback.
 *
 * STORY-066: Feedback Composer + Remediation Recommendations.
 *
 * Uses a Map<string, AttemptFeedback> keyed by attemptId.
 * Implements the IAttemptFeedbackRepository port interface.
 */

import { Result } from "@/domain/shared/Result";
import type { AttemptFeedback } from "@/domain/entities/AttemptFeedback";
import type {
  IAttemptFeedbackRepository,
  AttemptFeedbackError,
} from "@/ports/repositories/IAttemptFeedbackRepository";

export class InMemoryAttemptFeedbackRepository implements IAttemptFeedbackRepository {
  private readonly byAttemptId = new Map<string, AttemptFeedback>();
  private readonly byUserId = new Map<string, AttemptFeedback[]>();

  async create(feedback: AttemptFeedback): Promise<Result<void, AttemptFeedbackError>> {
    if (this.byAttemptId.has(feedback.attemptId)) {
      return Result.err({
        kind: "db_error",
        message: `Feedback for attempt ${feedback.attemptId} already exists`,
      });
    }

    this.byAttemptId.set(feedback.attemptId, feedback);

    const userFeedbacks = this.byUserId.get(feedback.userId) ?? [];
    this.byUserId.set(feedback.userId, [...userFeedbacks, feedback]);

    return Result.ok(undefined);
  }

  async findByAttemptId(
    attemptId: string,
  ): Promise<Result<AttemptFeedback | null, AttemptFeedbackError>> {
    const feedback = this.byAttemptId.get(attemptId) ?? null;
    return Result.ok(feedback);
  }

  async findByUserId(
    userId: string,
    limit?: number,
  ): Promise<Result<readonly AttemptFeedback[], AttemptFeedbackError>> {
    const feedbacks = this.byUserId.get(userId) ?? [];

    // Newest first
    const sorted = [...feedbacks].sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());

    const result = limit !== undefined ? sorted.slice(0, limit) : sorted;
    return Result.ok(result);
  }
}

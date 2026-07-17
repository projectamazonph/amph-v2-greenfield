/**
 * XPEvent — logs an XP award to a user.
 *
 * STORY-028: XPService + XP display on dashboard.
 */

import { Result } from "@/domain/shared/Result";

// ── Types ──────────────────────────────────────────────────────────────────

export interface XPEvent {
  readonly id: string;
  readonly userId: string;
  readonly amount: number; // positive XP amount
  readonly reason: XPReason;
  readonly refId?: string; // lessonId, courseId, quizAttemptId, etc.
  readonly createdAt: Date;
}

export type XPReason =
  | "lesson_completed"
  | "course_completed"
  | "quiz_passed"
  | "streak_bonus"
  | "badge_awarded";

export const VALID_XP_REASONS: readonly string[] = [
  "lesson_completed",
  "course_completed",
  "quiz_passed",
  "streak_bonus",
  "badge_awarded",
] as const;

export type XPEventError =
  | { kind: "invalid_user_id" }
  | { kind: "invalid_amount" }
  | { kind: "invalid_reason" };

export type CreateXPEventParams = {
  id: string;
  userId: string;
  amount: number;
  reason: string;
  refId?: string;
  createdAt: Date;
};

// ── Factory ────────────────────────────────────────────────────────────────

export function createXPEvent(params: CreateXPEventParams): Result<XPEvent, XPEventError> {
  if (!params.userId.trim()) {
    return Result.err({ kind: "invalid_user_id" });
  }

  if (params.amount <= 0) {
    return Result.err({ kind: "invalid_amount" });
  }

  if (!VALID_XP_REASONS.includes(params.reason as XPReason)) {
    return Result.err({ kind: "invalid_reason" });
  }

  const xpEvent: XPEvent = {
    id: params.id,
    userId: params.userId,
    amount: params.amount,
    reason: params.reason as XPReason,
    refId: params.refId,
    createdAt: params.createdAt,
  };

  return Result.ok(xpEvent);
}

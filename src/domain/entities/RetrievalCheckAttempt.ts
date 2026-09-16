/**
 * RetrievalCheckAttempt — mid-lesson retrieval check log row (LEARN-040).
 *
 * Append-only. The SelfCheck UI writes best-effort and never blocks
 * on a failure, so the domain has no transitions — just a validated
 * factory. Reads serve LEARN-041 (targeted remediation) and
 * LEARN-060 (learning events).
 */

import { Result } from "@/domain/shared/Result";

export interface RetrievalCheckAttempt {
  readonly id: string;
  readonly userId: string;
  readonly lessonSlug: string;
  readonly checkId: string;
  readonly correct: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt: Date | null;
  readonly createdById: string;
  readonly updatedById: string;
}

export type CreateRetrievalCheckError =
  { kind: "invalid_user_id" } | { kind: "invalid_lesson_slug" } | { kind: "invalid_check_id" };

export function createRetrievalCheck(params: {
  id: string;
  userId: string;
  lessonSlug: string;
  checkId: string;
  correct: boolean;
  createdById: string;
  createdAt?: Date;
}): Result<RetrievalCheckAttempt, CreateRetrievalCheckError> {
  if (!params.userId.trim()) {
    return Result.err({ kind: "invalid_user_id" });
  }
  if (!params.lessonSlug.trim()) {
    return Result.err({ kind: "invalid_lesson_slug" });
  }
  if (!params.checkId.trim()) {
    return Result.err({ kind: "invalid_check_id" });
  }
  const now = params.createdAt ?? new Date();
  return Result.ok({
    id: params.id,
    userId: params.userId,
    lessonSlug: params.lessonSlug.trim(),
    checkId: params.checkId.trim(),
    correct: params.correct,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    createdById: params.createdById,
    updatedById: params.createdById,
  });
}

/**
 * AdminDeleteQuiz — delete a quiz (hard delete, not soft-archive).
 *
 * STORY-091. Guards against deleting a quiz that has attempts:
 * `QuizAttempt.quizId` has no FK relation declared in the schema,
 * so a naive delete would silently orphan the attempt rows. The
 * use case explicitly blocks delete with a `has_attempts` error
 * when any attempts exist. Operator must clean up the attempts
 * (or reassign them) before retrying.
 *
 * Audit-log on success and on every error branch.
 */

import { Result } from "@/domain/shared/Result";
import type { IQuizRepository, QuizRepositoryError } from "@/ports/repositories/IQuizRepository";
import type { IQuizAttemptRepository } from "@/ports/repositories/IQuizAttemptRepository";
import type { RecordAuditLog } from "@/usecases/RecordAuditLog";

export interface AdminDeleteQuizInput {
  quizId: string;
  actorId: string;
}

export type AdminDeleteQuizError =
  | { kind: "not_found" }
  | { kind: "has_attempts"; attemptCount: number }
  | { kind: "db_error"; message: string };

export type AdminDeleteQuizResult = Result<{ deleted: true }, AdminDeleteQuizError>;

export interface AdminDeleteQuizDeps {
  quizRepo: IQuizRepository;
  quizAttemptRepo: IQuizAttemptRepository;
  recordAuditLog: RecordAuditLog;
}

export class AdminDeleteQuiz {
  constructor(private readonly deps: AdminDeleteQuizDeps) {}

  async execute(input: AdminDeleteQuizInput): Promise<AdminDeleteQuizResult> {
    // Block delete if any attempts reference the quiz. Count is
    // surfaced in the error so the admin UI can show "this quiz
    // has N attempts; reassign or remove them first".
    const countResult = await this.deps.quizAttemptRepo.countByQuizId(input.quizId);
    if (!countResult.ok) {
      await this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action: "quiz.delete_failed",
        targetType: "quiz",
        targetId: input.quizId,
        metadata: { reason: "db_error", phase: "count_attempts" },
      });
      return Result.err({ kind: "db_error", message: "countByQuizId failed" });
    }
    if (countResult.value > 0) {
      await this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action: "quiz.delete_failed",
        targetType: "quiz",
        targetId: input.quizId,
        metadata: { reason: "has_attempts", attemptCount: countResult.value },
      });
      return Result.err({ kind: "has_attempts", attemptCount: countResult.value });
    }

    const r = await this.deps.quizRepo.delete(input.quizId);
    if (!r.ok) {
      const e: QuizRepositoryError = r.error;
      if (e.kind === "not_found") {
        await this.deps.recordAuditLog.execute({
          actorId: input.actorId,
          action: "quiz.delete_failed",
          targetType: "quiz",
          targetId: input.quizId,
          metadata: { reason: "not_found" },
        });
        return Result.err({ kind: "not_found" });
      }
      await this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action: "quiz.delete_failed",
        targetType: "quiz",
        targetId: input.quizId,
        metadata: { reason: "db_error", message: e.message },
      });
      return Result.err({ kind: "db_error", message: e.message });
    }

    await this.deps.recordAuditLog.execute({
      actorId: input.actorId,
      action: "quiz.deleted",
      targetType: "quiz",
      targetId: input.quizId,
      metadata: {},
    });

    return Result.ok({ deleted: true });
  }
}

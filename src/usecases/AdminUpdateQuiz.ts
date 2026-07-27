/**
 * AdminUpdateQuiz — replace an existing quiz's title, passingScore,
 * and full questions/options tree.
 *
 * STORY-091. Reconstructs the full Quiz via `createQuiz(...)` (so
 * the same validation rules apply as on create), then hands it to
 * `IQuizRepository.update` which does a delete-and-recreate of
 * child rows inside a Prisma transaction (PrismaQuizRepository).
 *
 * Audit-log on success and on every error branch.
 */

import { Result } from "@/domain/shared/Result";
import {
  createQuiz,
  type CreateQuizError,
  type Quiz,
  type CreateQuizParams,
} from "@/domain/entities/Quiz";
import type { IQuizRepository, QuizRepositoryError } from "@/ports/repositories/IQuizRepository";
import type { RecordAuditLog } from "@/usecases/RecordAuditLog";

export interface AdminUpdateQuizInput {
  id: string;
  courseId: string;
  title: string;
  passingScore: number;
  questions: CreateQuizParams["questions"];
  actorId: string;
}

export type AdminUpdateQuizError =
  CreateQuizError | { kind: "not_found" } | { kind: "db_error"; message: string };

export type AdminUpdateQuizResult = Result<{ quiz: Quiz }, AdminUpdateQuizError>;

export interface AdminUpdateQuizDeps {
  quizRepo: IQuizRepository;
  recordAuditLog: RecordAuditLog;
}

export class AdminUpdateQuiz {
  constructor(private readonly deps: AdminUpdateQuizDeps) {}

  async execute(input: AdminUpdateQuizInput): Promise<AdminUpdateQuizResult> {
    const built = createQuiz({
      id: input.id,
      courseId: input.courseId,
      title: input.title,
      passingScore: input.passingScore,
      questions: input.questions,
    });
    if (!built.ok) {
      const e = built.error;
      await this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action: "quiz.update_failed",
        targetType: "quiz",
        targetId: input.id,
        metadata: { reason: e.kind },
      });
      return Result.err(e);
    }
    const quiz = built.value;

    const r = await this.deps.quizRepo.update(quiz);
    if (!r.ok) {
      const e: QuizRepositoryError = r.error;
      if (e.kind === "not_found") {
        await this.deps.recordAuditLog.execute({
          actorId: input.actorId,
          action: "quiz.update_failed",
          targetType: "quiz",
          targetId: quiz.id,
          metadata: { reason: "not_found" },
        });
        return Result.err({ kind: "not_found" });
      }
      await this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action: "quiz.update_failed",
        targetType: "quiz",
        targetId: quiz.id,
        metadata: { reason: "db_error", message: e.message },
      });
      return Result.err({ kind: "db_error", message: e.message });
    }

    await this.deps.recordAuditLog.execute({
      actorId: input.actorId,
      action: "quiz.updated",
      targetType: "quiz",
      targetId: quiz.id,
      metadata: {
        courseId: quiz.courseId,
        title: quiz.title,
        questionCount: quiz.questions.length,
      },
    });

    return Result.ok({ quiz: r.value });
  }
}

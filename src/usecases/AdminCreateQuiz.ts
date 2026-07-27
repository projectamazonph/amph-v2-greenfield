/**
 * AdminCreateQuiz — create a new quiz.
 *
 * STORY-091. Calls recordAuditLog on success and on every error
 * branch. Mirrors AdminCreateBadge's per-branch audit-log pattern.
 *
 * `actorId` is injected by the server action layer (never accepted
 * from the client-facing input type).
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

// Client-facing input: no actorId.
export interface AdminCreateQuizInput {
  id: string;
  courseId: string;
  title: string;
  passingScore: number;
  questions: CreateQuizParams["questions"];
  actorId: string;
}

export type AdminCreateQuizError = CreateQuizError | { kind: "db_error"; message: string };

export type AdminCreateQuizResult = Result<{ quiz: Quiz }, AdminCreateQuizError>;

export interface AdminCreateQuizDeps {
  quizRepo: IQuizRepository;
  recordAuditLog: RecordAuditLog;
}

export class AdminCreateQuiz {
  constructor(private readonly deps: AdminCreateQuizDeps) {}

  async execute(input: AdminCreateQuizInput): Promise<AdminCreateQuizResult> {
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
        action: "quiz.create_failed",
        targetType: "quiz",
        targetId: input.id,
        metadata: { reason: e.kind },
      });
      return Result.err(e);
    }
    const quiz = built.value;

    const r = await this.deps.quizRepo.create(quiz);
    if (!r.ok) {
      const e: QuizRepositoryError = r.error;
      await this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action: "quiz.create_failed",
        targetType: "quiz",
        targetId: quiz.id,
        metadata: { reason: e.kind, message: e.kind === "db_error" ? e.message : undefined },
      });
      return Result.err({ kind: "db_error", message: e.kind === "db_error" ? e.message : e.kind });
    }

    await this.deps.recordAuditLog.execute({
      actorId: input.actorId,
      action: "quiz.created",
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

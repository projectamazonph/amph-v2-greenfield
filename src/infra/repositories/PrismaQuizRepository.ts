/**
 * PrismaQuizRepository — production adapter for IQuizRepository.
 *
 * STORY-031: Quiz + QuizAttempt models + repositories.
 */

import { PrismaClient } from "@prisma/client";
import { Result } from "@/domain/shared/Result";
import type { IQuizRepository, QuizRepositoryError } from "@/ports/repositories/IQuizRepository";
import type { Quiz } from "@/domain/entities/Quiz";

export class PrismaQuizRepository implements IQuizRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(quiz: Quiz): Promise<Result<Quiz, QuizRepositoryError>> {
    try {
      const q = await this.db.quiz.create({
        data: {
          id: quiz.id,
          courseId: quiz.courseId,
          title: quiz.title,
          passingScore: quiz.passingScore,
        },
      });

      // Persist the question/option order as the array index, NOT a
      // hardcoded 0. The previous implementation stamped every
      // question and every option with order=0, which made
      // findById/findByCourseId return the rows in undefined order
      // (the `orderBy: { order: 'asc' }` in those queries was a
      // no-op when every row had the same order). This is the
      // fix for the bug surfaced in the 2026-07-27 grounding.
      for (const [qIndex, question] of quiz.questions.entries()) {
        const qRow = await this.db.quizQuestion.create({
          data: {
            id: question.id,
            quizId: q.id,
            questionText: question.questionText,
            explanation: question.explanation,
            order: qIndex,
          },
        });

        for (const [oIndex, option] of question.options.entries()) {
          await this.db.quizOption.create({
            data: {
              id: option.id,
              questionId: qRow.id,
              optionText: option.optionText,
              isCorrect: option.isCorrect,
              order: oIndex,
            },
          });
        }
      }

      return Result.ok(quiz);
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async findById(id: string): Promise<Result<Quiz | null, QuizRepositoryError>> {
    try {
      const quiz = await this.db.quiz.findUnique({ where: { id } });
      if (!quiz) return Result.ok(null);

      const questions = await this.db.quizQuestion.findMany({
        where: { quizId: id },
        orderBy: { order: "asc" },
      });

      const questionsWithOptions = await Promise.all(
        questions.map(async (q: { id: string; questionText: string; explanation: string }) => {
          const options = await this.db.quizOption.findMany({
            where: { questionId: q.id },
            orderBy: { order: "asc" },
          });
          return { ...q, options };
        }),
      );

      return Result.ok(this.mapQuiz(quiz, questionsWithOptions));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async findByCourseId(courseId: string): Promise<Result<readonly Quiz[], QuizRepositoryError>> {
    try {
      const quizzes = await this.db.quiz.findMany({
        where: { courseId },
        orderBy: { createdAt: "asc" },
      });

      const result = await Promise.all(
        quizzes.map(
          async (quiz: { id: string; courseId: string; title: string; passingScore: number }) => {
            const questions = await this.db.quizQuestion.findMany({
              where: { quizId: quiz.id },
              orderBy: { order: "asc" },
            });
            const questionsWithOptions = await Promise.all(
              questions.map(
                async (q: { id: string; questionText: string; explanation: string }) => {
                  const options = await this.db.quizOption.findMany({
                    where: { questionId: q.id },
                    orderBy: { order: "asc" },
                  });
                  return { ...q, options };
                },
              ),
            );
            return this.mapQuiz(quiz, questionsWithOptions);
          },
        ),
      );

      return Result.ok(result);
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async findAll(): Promise<Result<readonly Quiz[], QuizRepositoryError>> {
    try {
      const quizzes = await this.db.quiz.findMany({
        orderBy: { createdAt: "asc" },
      });
      const result = await Promise.all(
        quizzes.map(
          async (quiz: { id: string; courseId: string; title: string; passingScore: number }) => {
            const questions = await this.db.quizQuestion.findMany({
              where: { quizId: quiz.id },
              orderBy: { order: "asc" },
            });
            const questionsWithOptions = await Promise.all(
              questions.map(
                async (q: { id: string; questionText: string; explanation: string }) => {
                  const options = await this.db.quizOption.findMany({
                    where: { questionId: q.id },
                    orderBy: { order: "asc" },
                  });
                  return { ...q, options };
                },
              ),
            );
            return this.mapQuiz(quiz, questionsWithOptions);
          },
        ),
      );
      return Result.ok(result);
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async update(quiz: Quiz): Promise<Result<Quiz, QuizRepositoryError>> {
    try {
      // Verify the row exists. We don't rely on the cascade delete's
      // "row not found" branch because Prisma's P2025 message varies
      // across versions, and `not_found` is the contract we want.
      const existing = await this.db.quiz.findUnique({ where: { id: quiz.id } });
      if (!existing) {
        return Result.err({ kind: "not_found" });
      }

      // Atomic replace of the children. The schema cascades
      // `QuizQuestion` on `Quiz` delete, which in turn cascades
      // `QuizOption` on `QuizQuestion` delete; deleting the old
      // questions inside a transaction is enough.
      await this.db.$transaction([
        this.db.quizQuestion.deleteMany({ where: { quizId: quiz.id } }),
        this.db.quiz.update({
          where: { id: quiz.id },
          data: {
            title: quiz.title,
            passingScore: quiz.passingScore,
          },
        }),
        ...quiz.questions.flatMap((question, qIndex) => [
          this.db.quizQuestion.create({
            data: {
              id: question.id,
              quizId: quiz.id,
              questionText: question.questionText,
              explanation: question.explanation,
              order: qIndex,
            },
          }),
          ...question.options.map((option, oIndex) =>
            this.db.quizOption.create({
              data: {
                id: option.id,
                questionId: question.id,
                optionText: option.optionText,
                isCorrect: option.isCorrect,
                order: oIndex,
              },
            }),
          ),
        ]),
      ]);

      return Result.ok(quiz);
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async delete(id: string): Promise<Result<void, QuizRepositoryError>> {
    try {
      const existing = await this.db.quiz.findUnique({ where: { id } });
      if (!existing) {
        return Result.err({ kind: "not_found" });
      }
      // Children cascade via the Prisma schema (QuizQuestion has
      // `onDelete: Cascade` on its `quiz` relation; QuizOption has
      // the same on its `question` relation).
      await this.db.quiz.delete({ where: { id } });
      return Result.ok(undefined);
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  private mapQuiz(
    row: { id: string; courseId: string; title: string; passingScore: number },
    questions: {
      id: string;
      questionText: string;
      explanation: string;
      options: { id: string; optionText: string; isCorrect: boolean }[];
    }[],
  ): Quiz {
    return {
      id: row.id,
      courseId: row.courseId,
      title: row.title,
      passingScore: row.passingScore,
      questions: questions.map((q) => ({
        id: q.id,
        questionText: q.questionText,
        explanation: q.explanation,
        options: q.options.map((o) => ({
          id: o.id,
          optionText: o.optionText,
          isCorrect: o.isCorrect,
        })),
      })),
    };
  }
}

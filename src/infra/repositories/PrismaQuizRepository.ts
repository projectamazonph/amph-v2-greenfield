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

      for (const question of quiz.questions) {
        const qRow = await this.db.quizQuestion.create({
          data: {
            id: question.id,
            quizId: q.id,
            questionText: question.questionText,
            order: 0,
          },
        });

        for (const option of question.options) {
          await this.db.quizOption.create({
            data: {
              id: option.id,
              questionId: qRow.id,
              optionText: option.optionText,
              isCorrect: option.isCorrect,
              order: 0,
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
        questions.map(async (q: { id: string; questionText: string }) => {
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
        quizzes.map(async (quiz: { id: string; courseId: string; title: string; passingScore: number }) => {
          const questions = await this.db.quizQuestion.findMany({
            where: { quizId: quiz.id },
            orderBy: { order: "asc" },
          });
          const questionsWithOptions = await Promise.all(
            questions.map(async (q: { id: string; questionText: string }) => {
              const options = await this.db.quizOption.findMany({
                where: { questionId: q.id },
                orderBy: { order: "asc" },
              });
              return { ...q, options };
            }),
          );
          return this.mapQuiz(quiz, questionsWithOptions);
        }),
      );

      return Result.ok(result);
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  private mapQuiz(
    row: { id: string; courseId: string; title: string; passingScore: number },
    questions: {
      id: string;
      questionText: string;
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
        options: q.options.map((o) => ({
          id: o.id,
          optionText: o.optionText,
          isCorrect: o.isCorrect,
        })),
      })),
    };
  }
}

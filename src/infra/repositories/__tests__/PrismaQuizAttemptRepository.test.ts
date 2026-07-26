/**
 * PrismaQuizAttemptRepository.test.ts — audit hardening follow-up.
 *
 * No test coverage existed for this adapter before this change. Focused
 * on the new status validation added to mapRow() (mirrors
 * PrismaOrderRepository's PaymentStatus.isValid() guard) — a corrupt or
 * legacy status string must not silently hydrate a QuizAttempt that
 * bypasses the completeQuizAttempt() transition guard.
 *
 * Hand-rolled in-memory PrismaClient fake, following the pattern
 * established by PrismaAuditLog.test.ts.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { PrismaQuizAttemptRepository } from "@/infra/repositories/PrismaQuizAttemptRepository";

interface QuizAttemptRow {
  id: string;
  userId: string;
  quizId: string;
  status: string;
  score: number | null;
  passed: boolean | null;
  startedAt: Date;
  completedAt: Date | null;
}

function makeRow(overrides: Partial<QuizAttemptRow> = {}): QuizAttemptRow {
  return {
    id: "qa_1",
    userId: "user_1",
    quizId: "quiz_1",
    status: "in_progress",
    score: null,
    passed: null,
    startedAt: new Date("2026-07-26T00:00:00Z"),
    completedAt: null,
    ...overrides,
  };
}

class FakePrismaClient {
  rows: QuizAttemptRow[] = [];
  answers: Array<{ attemptId: string; questionId: string; selectedOptionId: string }> = [];

  quizAttempt = {
    findUnique: async (args: { where: { id: string } }) => {
      return this.rows.find((r) => r.id === args.where.id) ?? null;
    },
    findMany: async (args: { where: { userId: string; quizId: string } }) => {
      return this.rows.filter(
        (r) => r.userId === args.where.userId && r.quizId === args.where.quizId,
      );
    },
    findFirst: async (args: { where: { userId: string; quizId: string } }) => {
      return (
        this.rows.find((r) => r.userId === args.where.userId && r.quizId === args.where.quizId) ??
        null
      );
    },
  };

  quizAttemptAnswer = {
    findMany: async (args: { where: { attemptId: string } }) => {
      return this.answers.filter((a) => a.attemptId === args.where.attemptId);
    },
  };
}

describe("PrismaQuizAttemptRepository", () => {
  let db: FakePrismaClient;
  let repo: PrismaQuizAttemptRepository;

  beforeEach(() => {
    db = new FakePrismaClient();
    repo = new PrismaQuizAttemptRepository(db as never);
  });

  describe("happy path", () => {
    it("findById maps a valid row to a QuizAttempt with its answers", async () => {
      db.rows.push(makeRow());
      db.answers.push({ attemptId: "qa_1", questionId: "q1", selectedOptionId: "o1" });

      const result = await repo.findById("qa_1");
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value?.status).toBe("in_progress");
      expect(result.value?.answers).toEqual([{ questionId: "q1", selectedOptionId: "o1" }]);
    });

    it("findById returns ok(null) when not found", async () => {
      const result = await repo.findById("nope");
      expect(result.ok).toBe(true);
      expect(result.ok && result.value).toBeNull();
    });

    it("findByUserAndQuiz maps every matching row", async () => {
      db.rows.push(makeRow({ id: "qa_1", status: "completed" }));
      db.rows.push(makeRow({ id: "qa_2", status: "in_progress" }));
      const result = await repo.findByUserAndQuiz("user_1", "quiz_1");
      expect(result.ok && result.value).toHaveLength(2);
    });

    it("findLatestByUserAndQuiz maps the row", async () => {
      db.rows.push(makeRow());
      const result = await repo.findLatestByUserAndQuiz("user_1", "quiz_1");
      expect(result.ok && result.value?.id).toBe("qa_1");
    });
  });

  describe("corrupt status guard", () => {
    it("findById returns db_error for an invalid persisted status", async () => {
      db.rows.push(makeRow({ status: "not_a_real_status" }));
      const result = await repo.findById("qa_1");
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.kind).toBe("db_error");
    });

    it("findByUserAndQuiz returns db_error if any row has an invalid status", async () => {
      db.rows.push(makeRow({ id: "qa_1", status: "in_progress" }));
      db.rows.push(makeRow({ id: "qa_2", status: "bogus" }));
      const result = await repo.findByUserAndQuiz("user_1", "quiz_1");
      expect(result.ok).toBe(false);
    });

    it("findLatestByUserAndQuiz returns db_error for an invalid persisted status", async () => {
      db.rows.push(makeRow({ status: "bogus" }));
      const result = await repo.findLatestByUserAndQuiz("user_1", "quiz_1");
      expect(result.ok).toBe(false);
    });
  });
});

/**
 * PrismaQuizRepository adapter tests.
 *
 * STORY-091: Admin quiz CRUD — verifies the order-persistence fix
 * (questions/options were being stamped with order=0; this catches
 * any regression to that bug) plus the new update/delete/findAll
 * surface.
 *
 * Uses a hand-rolled in-memory PrismaClient fake so the test stays
 * fast and DB-free. Mirrors the pattern from
 * PrismaSimulatorAttemptRepository.test.ts.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { Result } from "@/domain/shared/Result";
import { PrismaQuizRepository } from "@/infra/repositories/PrismaQuizRepository";
import { createQuiz } from "@/domain/entities/Quiz";
import type { Quiz } from "@/domain/entities/Quiz";

// ── Hand-rolled fake PrismaClient ─────────────────────────────────────────

interface QuizRow {
  id: string;
  courseId: string;
  title: string;
  passingScore: number;
  createdAt: Date;
}

interface QuizQuestionRow {
  id: string;
  quizId: string;
  questionText: string;
  explanation: string;
  order: number;
}

interface QuizOptionRow {
  id: string;
  questionId: string;
  optionText: string;
  isCorrect: boolean;
  order: number;
}

class FakePrismaClient {
  quizzes: QuizRow[] = [];
  questions: QuizQuestionRow[] = [];
  options: QuizOptionRow[] = [];
  failNextCreate = false;

  private tick(): Date {
    return new Date();
  }

  private ensureUnique<T extends { id: string }>(rows: T[], id: string, kind: string): void {
    if (rows.some((r) => r.id === id)) {
      throw new Error(`unique constraint violation on ${kind} id=${id}`);
    }
  }

  quiz = {
    create: async (args: {
      data: { id: string; courseId: string; title: string; passingScore: number };
    }) => {
      if (this.failNextCreate) {
        this.failNextCreate = false;
        throw new Error("forced create error");
      }
      this.ensureUnique(this.quizzes, args.data.id, "quiz");
      const row: QuizRow = { ...args.data, createdAt: this.tick() };
      this.quizzes.push(row);
      return row;
    },

    findUnique: async (args: { where: { id: string } }) => {
      const row = this.quizzes.find((q) => q.id === args.where.id);
      return row ?? null;
    },

    findMany: async (args?: {
      where?: { courseId?: string };
      orderBy?: { createdAt: "asc" | "desc" };
    }) => {
      let rows = this.quizzes;
      if (args?.where?.courseId !== undefined) {
        rows = rows.filter((q) => q.courseId === args.where!.courseId);
      }
      return [...rows].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    },

    update: async (args: { where: { id: string }; data: Partial<QuizRow> }) => {
      const idx = this.quizzes.findIndex((q) => q.id === args.where.id);
      if (idx === -1) {
        const err = new Error("Record to update not found") as Error & { code: string };
        err.code = "P2025";
        throw err;
      }
      this.quizzes[idx] = { ...this.quizzes[idx]!, ...args.data };
      return this.quizzes[idx]!;
    },

    delete: async (args: { where: { id: string } }) => {
      const idx = this.quizzes.findIndex((q) => q.id === args.where.id);
      if (idx === -1) {
        const err = new Error("Record to delete not found") as Error & { code: string };
        err.code = "P2025";
        throw err;
      }
      const [removed] = this.quizzes.splice(idx, 1);
      // Cascade: drop the questions and their options.
      const droppedQuestions = this.questions.filter((q) => q.quizId === removed!.id);
      const droppedQuestionIds = new Set(droppedQuestions.map((q) => q.id));
      this.questions = this.questions.filter((q) => q.quizId !== removed!.id);
      this.options = this.options.filter((o) => !droppedQuestionIds.has(o.questionId));
      return removed!;
    },
  };

  quizQuestion = {
    create: async (args: {
      data: {
        id: string;
        quizId: string;
        questionText: string;
        explanation: string;
        order: number;
      };
    }) => {
      this.ensureUnique(this.questions, args.data.id, "quizQuestion");
      const row: QuizQuestionRow = args.data;
      this.questions.push(row);
      return row;
    },

    findMany: async (args: { where: { quizId: string }; orderBy?: { order: "asc" | "desc" } }) => {
      const rows = this.questions.filter((q) => q.quizId === args.where.quizId);
      return [...rows].sort((a, b) => a.order - b.order);
    },

    deleteMany: async (args: { where: { quizId: string } }) => {
      const before = this.questions.length;
      this.questions = this.questions.filter((q) => q.quizId !== args.where.quizId);
      const droppedIds = new Set(
        this.options
          .filter((o) => !this.questions.some((q) => q.id === o.questionId))
          .map((o) => o.id),
      );
      this.options = this.options.filter((o) => !droppedIds.has(o.id));
      return { count: before - this.questions.length };
    },
  };

  quizOption = {
    create: async (args: {
      data: {
        id: string;
        questionId: string;
        optionText: string;
        isCorrect: boolean;
        order: number;
      };
    }) => {
      this.ensureUnique(this.options, args.data.id, "quizOption");
      const row: QuizOptionRow = args.data;
      this.options.push(row);
      return row;
    },

    findMany: async (args: {
      where: { questionId: string };
      orderBy?: { order: "asc" | "desc" };
    }) => {
      const rows = this.options.filter((o) => o.questionId === args.where.questionId);
      return [...rows].sort((a, b) => a.order - b.order);
    },
  };

  $transaction = async <T>(ops: Promise<T>[]): Promise<T[]> => {
    return Promise.all(ops);
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────

function makeQuiz(
  overrides: {
    id?: string;
    courseId?: string;
    title?: string;
    questions?: Array<{
      id: string;
      questionText: string;
      options: { id: string; optionText: string; isCorrect: boolean }[];
      explanation?: string;
    }>;
  } = {},
): Quiz {
  const r = createQuiz({
    id: overrides.id ?? "quiz-1",
    courseId: overrides.courseId ?? "course-1",
    title: overrides.title ?? "Test Quiz",
    passingScore: 70,
    questions: overrides.questions ?? [
      {
        id: "q1",
        questionText: "What?",
        options: [
          { id: "o1", optionText: "A", isCorrect: true },
          { id: "o2", optionText: "B", isCorrect: false },
        ],
      },
      {
        id: "q2",
        questionText: "Why?",
        options: [
          { id: "o3", optionText: "Because", isCorrect: true },
          { id: "o4", optionText: "Why not", isCorrect: false },
          { id: "o5", optionText: "42", isCorrect: false },
        ],
      },
    ],
  });
  if (!r.ok) throw new Error("fixture: " + r.error.kind);
  return r.value;
}

describe("PrismaQuizRepository", () => {
  let db: FakePrismaClient;
  let repo: PrismaQuizRepository;

  beforeEach(() => {
    db = new FakePrismaClient();
    // The Prisma adapter expects a PrismaClient; the fake conforms
    // structurally via duck-typing for the methods we use.
    repo = new PrismaQuizRepository(
      db as unknown as ConstructorParameters<typeof PrismaQuizRepository>[0],
    );
  });

  // ── Order persistence: the bug the 2026-07-27 grounding surfaced ─────

  describe("create — question and option order", () => {
    it("persists question order matching the array index (not 0)", async () => {
      const quiz = makeQuiz();
      const result = await repo.create(quiz);
      expect(result.ok).toBe(true);
      // The first question should be order=0, the second order=1.
      const q1 = db.questions.find((q) => q.id === "q1");
      const q2 = db.questions.find((q) => q.id === "q2");
      expect(q1?.order).toBe(0);
      expect(q2?.order).toBe(1);
    });

    it("persists option order matching the per-question array index (not 0)", async () => {
      const quiz = makeQuiz();
      await repo.create(quiz);
      // q1 has 2 options (indices 0, 1); q2 has 3 options (indices 0, 1, 2).
      const q1Opts = db.options
        .filter((o) => o.questionId === "q1")
        .sort((a, b) => a.order - b.order);
      const q2Opts = db.options
        .filter((o) => o.questionId === "q2")
        .sort((a, b) => a.order - b.order);
      expect(q1Opts.map((o) => o.order)).toEqual([0, 1]);
      expect(q2Opts.map((o) => o.order)).toEqual([0, 1, 2]);
    });
  });

  // ── findById: round-trip the order fix ────────────────────────────────

  describe("findById — hydration respects order", () => {
    it("returns questions in their persisted order", async () => {
      await repo.create(makeQuiz());
      const result = await repo.findById("quiz-1");
      expect(result.ok).toBe(true);
      if (!result.ok || !result.value) return;
      expect(result.value.questions.map((q) => q.id)).toEqual(["q1", "q2"]);
      expect(result.value.questions[0]!.options.map((o) => o.id)).toEqual(["o1", "o2"]);
      expect(result.value.questions[1]!.options.map((o) => o.id)).toEqual(["o3", "o4", "o5"]);
    });
  });

  describe("explanation round-trip", () => {
    it("persists and hydrates each question's explanation", async () => {
      await repo.create(
        makeQuiz({
          questions: [
            {
              id: "q1",
              questionText: "What?",
              explanation: "Because A is correct.",
              options: [
                { id: "o1", optionText: "A", isCorrect: true },
                { id: "o2", optionText: "B", isCorrect: false },
              ],
            },
          ],
        }),
      );
      const result = await repo.findById("quiz-1");
      expect(result.ok).toBe(true);
      if (!result.ok || !result.value) return;
      expect(result.value.questions[0]!.explanation).toBe("Because A is correct.");
    });

    it("defaults to an empty string when no explanation was given", async () => {
      await repo.create(makeQuiz());
      const result = await repo.findById("quiz-1");
      expect(result.ok).toBe(true);
      if (!result.ok || !result.value) return;
      expect(result.value.questions[0]!.explanation).toBe("");
    });
  });

  // ── findAll ────────────────────────────────────────────────────────────

  describe("findAll", () => {
    it("returns every quiz", async () => {
      await repo.create(makeQuiz({ id: "a", courseId: "c1" }));
      await repo.create(makeQuiz({ id: "b", courseId: "c2" }));
      const result = await repo.findAll();
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value).toHaveLength(2);
    });

    it("returns an empty array when no quizzes exist", async () => {
      const result = await repo.findAll();
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value).toEqual([]);
    });
  });

  // ── update: atomic replace of children ────────────────────────────────

  describe("update", () => {
    it("replaces the quiz and its children in one transaction", async () => {
      await repo.create(makeQuiz());
      const replacement = makeQuiz({
        title: "Updated",
        questions: [
          {
            id: "new-q1",
            questionText: "Updated Q",
            options: [{ id: "new-o1", optionText: "X", isCorrect: true }],
          },
        ],
      });
      const result = await repo.update(replacement);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.title).toBe("Updated");
      // Old questions/options are gone.
      expect(db.questions.find((q) => q.id === "q1")).toBeUndefined();
      expect(db.questions.find((q) => q.id === "q2")).toBeUndefined();
      expect(db.options.find((o) => o.questionId === "q1")).toBeUndefined();
      // New ones are present with the right order.
      const newQ = db.questions.find((q) => q.id === "new-q1");
      expect(newQ?.order).toBe(0);
      const newO = db.options.find((o) => o.id === "new-o1");
      expect(newO?.order).toBe(0);
    });

    it("returns not_found when the quiz doesn't exist", async () => {
      const result = await repo.update(makeQuiz({ id: "missing" }));
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.kind).toBe("not_found");
    });
  });

  // ── delete: cascade to children ───────────────────────────────────────

  describe("delete", () => {
    it("removes the quiz and cascades to questions and options", async () => {
      await repo.create(makeQuiz());
      const result = await repo.delete("quiz-1");
      expect(result.ok).toBe(true);
      expect(db.quizzes.find((q) => q.id === "quiz-1")).toBeUndefined();
      expect(db.questions).toHaveLength(0);
      expect(db.options).toHaveLength(0);
    });

    it("returns not_found when the quiz doesn't exist", async () => {
      const result = await repo.delete("missing");
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.kind).toBe("not_found");
    });
  });

  // ── Error mapping ──────────────────────────────────────────────────────

  describe("create — db_error mapping", () => {
    it("maps a thrown error to db_error", async () => {
      db.failNextCreate = true;
      const result = await repo.create(makeQuiz());
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.kind).toBe("db_error");
    });
  });
});

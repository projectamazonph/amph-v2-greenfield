/**
 * RecordQuizAttempt use case tests — TDD (red first).
 *
 * STORY-032: RecordQuizAttempt use case.
 *
 * These tests describe the desired behavior.
 * Write them first. Run them — they must fail.
 * Then write the minimum code to make them pass.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Result } from "@/domain/shared/Result";
import { RecordQuizAttempt } from "@/usecases/RecordQuizAttempt";
import { createQuiz } from "@/domain/entities/Quiz";
import { InMemoryQuizRepository } from "@/infra/repositories/InMemoryQuizRepository";
import { InMemoryQuizAttemptRepository } from "@/infra/repositories/InMemoryQuizAttemptRepository";
import { InMemoryXPEventRepository } from "@/infra/repositories/InMemoryXPEventRepository";
import { InMemoryUserRepository } from "@/infra/repositories/InMemoryUserRepository";
import { InMemoryIdGenerator } from "@/infra/system/InMemoryIdGenerator";
import { FixedClock } from "@/ports/system/Clock";
import type { IQuizRepository } from "@/ports/repositories/IQuizRepository";
import type { IQuizAttemptRepository } from "@/ports/repositories/IQuizAttemptRepository";
import type { IXPEventRepository } from "@/ports/repositories/IXPEventRepository";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import type { IdGenerator } from "@/ports/system/IdGenerator";
import type { Clock } from "@/ports/system/Clock";

// ── Fixtures ────────────────────────────────────────────────────────────────

const USER_ID = "user-1";
const QUIZ_ID = "quiz-1";

function makeQuiz() {
  const r = createQuiz({
    id: QUIZ_ID,
    courseId: "course-1",
    title: "PPC Basics",
    passingScore: 70,
    questions: [
      {
        id: "q1",
        questionText: "What does PPC stand for?",
        options: [
          { id: "o1", optionText: "Pay Per Click", isCorrect: true },
          { id: "o2", optionText: "Post Paid Credit", isCorrect: false },
        ],
      },
      {
        id: "q2",
        questionText: "What does CPC stand for?",
        options: [
          { id: "o3", optionText: "Cost Per Click", isCorrect: true },
          { id: "o4", optionText: "Cost Per Conversion", isCorrect: false },
        ],
      },
    ],
  });
  if (!r.ok) throw new Error("Fixture creation failed");
  return r.value;
}

function buildUseCase(deps: {
  quizRepo: IQuizRepository;
  quizAttemptRepo: IQuizAttemptRepository;
  xpEventRepo: IXPEventRepository;
  userRepo: UserRepository;
  idGen: IdGenerator;
  clock: Clock;
}) {
  return new RecordQuizAttempt(deps);
}

// ── RED: RecordQuizAttempt ────────────────────────────────────────────────

describe("RecordQuizAttempt", () => {
  let quizRepo: InMemoryQuizRepository;
  let quizAttemptRepo: InMemoryQuizAttemptRepository;
  let xpEventRepo: InMemoryXPEventRepository;
  let userRepo: InMemoryUserRepository;
  let idGen: InMemoryIdGenerator;
  let clock: FixedClock;

  beforeEach(() => {
    quizRepo = new InMemoryQuizRepository();
    quizAttemptRepo = new InMemoryQuizAttemptRepository();
    xpEventRepo = new InMemoryXPEventRepository();
    userRepo = new InMemoryUserRepository();
    idGen = new InMemoryIdGenerator();
    clock = new FixedClock(new Date("2026-01-01T00:00:00Z"));
  });

  describe("quiz not found", () => {
    it("returns quiz_not_found error when quiz does not exist", async () => {
      const useCase = buildUseCase({
        quizRepo,
        quizAttemptRepo,
        xpEventRepo,
        userRepo,
        idGen,
        clock,
      });

      const result = await useCase.execute({
        userId: USER_ID,
        quizId: "nonexistent-quiz",
        answers: [],
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe("quiz_not_found");
      }
    });
  });

  describe("invalid answer — questionId", () => {
    it("returns invalid_answer error when questionId is not in quiz", async () => {
      const quiz = makeQuiz();
      quizRepo.seed(quiz);

      const useCase = buildUseCase({
        quizRepo,
        quizAttemptRepo,
        xpEventRepo,
        userRepo,
        idGen,
        clock,
      });

      const result = await useCase.execute({
        userId: USER_ID,
        quizId: QUIZ_ID,
        answers: [{ questionId: "nonexistent-q", selectedOptionId: "o1" }],
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe("invalid_answer");
        if (result.error.kind === "invalid_answer") {
          expect(result.error.questionId).toBe("nonexistent-q");
        }
      }
    });
  });

  describe("invalid answer — optionId", () => {
    it("returns invalid_answer error when optionId is not in the question", async () => {
      const quiz = makeQuiz();
      quizRepo.seed(quiz);

      const useCase = buildUseCase({
        quizRepo,
        quizAttemptRepo,
        xpEventRepo,
        userRepo,
        idGen,
        clock,
      });

      const result = await useCase.execute({
        userId: USER_ID,
        quizId: QUIZ_ID,
        answers: [{ questionId: "q1", selectedOptionId: "nonexistent-o" }],
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.kind).toBe("invalid_answer");
        if (result.error.kind === "invalid_answer") {
          expect(result.error.questionId).toBe("q1");
        }
      }
    });
  });

  describe("all questions answered — passing", () => {
    it("returns completed attempt with passed=true and score=100 when all correct", async () => {
      const quiz = makeQuiz();
      quizRepo.seed(quiz);

      const useCase = buildUseCase({
        quizRepo,
        quizAttemptRepo,
        xpEventRepo,
        userRepo,
        idGen,
        clock,
      });

      const result = await useCase.execute({
        userId: USER_ID,
        quizId: QUIZ_ID,
        answers: [
          { questionId: "q1", selectedOptionId: "o1" }, // correct
          { questionId: "q2", selectedOptionId: "o3" }, // correct
        ],
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.passed).toBe(true);
      expect(result.value.score).toBe(100);
      expect(result.value.attempt.status).toBe("completed");
    });

    it("awards XP fire-and-forget when passed", async () => {
      const quiz = makeQuiz();
      quizRepo.seed(quiz);

      const useCase = buildUseCase({
        quizRepo,
        quizAttemptRepo,
        xpEventRepo,
        userRepo,
        idGen,
        clock,
      });

      const result = await useCase.execute({
        userId: USER_ID,
        quizId: QUIZ_ID,
        answers: [
          { questionId: "q1", selectedOptionId: "o1" },
          { questionId: "q2", selectedOptionId: "o3" },
        ],
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.xpAwarded).toBeGreaterThan(0);
    });
  });

  describe("all questions answered — failing", () => {
    it("returns passed=false when score below passingScore (50% < 70%)", async () => {
      const quiz = makeQuiz();
      quizRepo.seed(quiz);

      const useCase = buildUseCase({
        quizRepo,
        quizAttemptRepo,
        xpEventRepo,
        userRepo,
        idGen,
        clock,
      });

      const result = await useCase.execute({
        userId: USER_ID,
        quizId: QUIZ_ID,
        answers: [
          { questionId: "q1", selectedOptionId: "o1" }, // correct
          { questionId: "q2", selectedOptionId: "o4" }, // wrong (o3 is correct)
        ],
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.passed).toBe(false);
      expect(result.value.score).toBe(50);
      expect(result.value.attempt.status).toBe("completed");
    });

    it("awards 0 XP when failed", async () => {
      const quiz = makeQuiz();
      quizRepo.seed(quiz);

      const useCase = buildUseCase({
        quizRepo,
        quizAttemptRepo,
        xpEventRepo,
        userRepo,
        idGen,
        clock,
      });

      const result = await useCase.execute({
        userId: USER_ID,
        quizId: QUIZ_ID,
        answers: [
          { questionId: "q1", selectedOptionId: "o1" },
          { questionId: "q2", selectedOptionId: "o4" }, // wrong
        ],
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.xpAwarded).toBe(0);
    });
  });

  describe("some questions unanswered", () => {
    it("persists in-progress attempt and returns no score", async () => {
      const quiz = makeQuiz();
      quizRepo.seed(quiz);

      const useCase = buildUseCase({
        quizRepo,
        quizAttemptRepo,
        xpEventRepo,
        userRepo,
        idGen,
        clock,
      });

      const result = await useCase.execute({
        userId: USER_ID,
        quizId: QUIZ_ID,
        answers: [{ questionId: "q1", selectedOptionId: "o1" }], // only q1, missing q2
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.attempt.status).toBe("in_progress");
      expect(result.value.score).toBeNull();
      expect(result.value.passed).toBeNull();
      expect(result.value.xpAwarded).toBe(0);
    });
  });

  describe("duplicate answers for same question", () => {
    it("last answer wins", async () => {
      const quiz = makeQuiz();
      quizRepo.seed(quiz);

      const useCase = buildUseCase({
        quizRepo,
        quizAttemptRepo,
        xpEventRepo,
        userRepo,
        idGen,
        clock,
      });

      // Answer q1 twice — last one is wrong
      const result = await useCase.execute({
        userId: USER_ID,
        quizId: QUIZ_ID,
        answers: [
          { questionId: "q1", selectedOptionId: "o1" }, // correct (first)
          { questionId: "q1", selectedOptionId: "o2" }, // wrong (second — last wins)
          { questionId: "q2", selectedOptionId: "o3" }, // correct
        ],
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      // q1 was answered wrong (o2), q2 correct → 50% → failed
      expect(result.value.passed).toBe(false);
      expect(result.value.score).toBe(50);
    });
  });

  describe("XP award failure is silent", () => {
    it("returns ok even if XP award throws", async () => {
      const quiz = makeQuiz();
      quizRepo.seed(quiz);

      // Inject a broken xpRepo
      const brokenXpRepo = {
        async create() {
          throw new Error("XP DB down");
        },
        async findByUserId() {
          return Result.ok([]);
        },
      } as unknown as IXPEventRepository;

      const useCase = buildUseCase({
        quizRepo,
        quizAttemptRepo,
        xpEventRepo: brokenXpRepo,
        userRepo,
        idGen,
        clock,
      });

      const result = await useCase.execute({
        userId: USER_ID,
        quizId: QUIZ_ID,
        answers: [
          { questionId: "q1", selectedOptionId: "o1" },
          { questionId: "q2", selectedOptionId: "o3" },
        ],
      });

      // The use case should still succeed — XP failure is fire-and-forget
      expect(result.ok).toBe(true);
    });
  });

  describe("persistence", () => {
    it("persists the completed attempt in the repository", async () => {
      const quiz = makeQuiz();
      quizRepo.seed(quiz);

      const useCase = buildUseCase({
        quizRepo,
        quizAttemptRepo,
        xpEventRepo,
        userRepo,
        idGen,
        clock,
      });

      const result = await useCase.execute({
        userId: USER_ID,
        quizId: QUIZ_ID,
        answers: [
          { questionId: "q1", selectedOptionId: "o1" },
          { questionId: "q2", selectedOptionId: "o3" },
        ],
      });
      if (!result.ok) return;

      const saved = await quizAttemptRepo.findById(result.value.attempt.id);
      if (!saved.ok) return;
      expect(saved.value?.status).toBe("completed");
      expect(saved.value?.score).toBe(100);
    });

    it("persists the in-progress attempt when unanswered questions remain", async () => {
      const quiz = makeQuiz();
      quizRepo.seed(quiz);

      const useCase = buildUseCase({
        quizRepo,
        quizAttemptRepo,
        xpEventRepo,
        userRepo,
        idGen,
        clock,
      });

      const result = await useCase.execute({
        userId: USER_ID,
        quizId: QUIZ_ID,
        answers: [{ questionId: "q1", selectedOptionId: "o1" }],
      });
      if (!result.ok) return;

      const saved = await quizAttemptRepo.findById(result.value.attempt.id);
      if (!saved.ok) return;
      expect(saved.value?.status).toBe("in_progress");
      expect(saved.value?.answers).toHaveLength(1);
    });
  });
});

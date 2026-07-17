/**
 * processQuizAttempt — pure handler function tests — STORY-033.
 *
 * The HTTP route handler in `route.ts` is a 5-line wrapper around
 * `processQuizAttempt`. All business logic — auth check, validation,
 * use-case invocation, result mapping — lives in the pure function
 * tested here, so we don't have to mock `NextRequest`.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { processQuizAttempt } from "@/app/api/quizzes/[quizId]/attempt/processQuizAttempt";
import { InMemoryQuizRepository } from "@/infra/repositories/InMemoryQuizRepository";
import { InMemoryQuizAttemptRepository } from "@/infra/repositories/InMemoryQuizAttemptRepository";
import { InMemoryXPEventRepository } from "@/infra/repositories/InMemoryXPEventRepository";
import { InMemoryUserRepository } from "@/infra/repositories/InMemoryUserRepository";
import { InMemoryIdGenerator } from "@/infra/system/InMemoryIdGenerator";
import { FixedClock } from "@/ports/system/Clock";
import { createQuiz } from "@/domain/entities/Quiz";

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
      {
        id: "q3",
        questionText: "Pick a true statement",
        options: [
          { id: "o5", optionText: "CPC = cost per click", isCorrect: true },
          { id: "o6", optionText: "CPC = cost per conversion", isCorrect: false },
        ],
      },
    ],
  });
  if (!r.ok) throw new Error("Fixture creation failed");
  return r.value;
}

interface Deps {
  quizRepo: InMemoryQuizRepository;
  quizAttemptRepo: InMemoryQuizAttemptRepository;
  xpEventRepo: InMemoryXPEventRepository;
  userRepo: InMemoryUserRepository;
  idGen: InMemoryIdGenerator;
  clock: FixedClock;
}

function buildDeps(): Deps {
  const userRepo = new InMemoryUserRepository();
  userRepo.seed([
    {
      id: USER_ID,
      email: "student@example.com",
      passwordHash: "hash",
      firstName: "Test",
      lastName: "User",
    },
  ]);
  return {
    quizRepo: new InMemoryQuizRepository(),
    quizAttemptRepo: new InMemoryQuizAttemptRepository(),
    xpEventRepo: new InMemoryXPEventRepository(),
    userRepo,
    idGen: new InMemoryIdGenerator(),
    clock: new FixedClock(new Date("2026-01-01T00:00:00Z")),
  };
}

// ── Tests ────────────────────────────────────────────────────────────────

describe("processQuizAttempt", () => {
  let deps: Deps;

  beforeEach(() => {
    deps = buildDeps();
  });

  // ── happy path ─────────────────────────────────────────────

  it("returns 200 with score=100, passed=true, xpAwarded=20 for a perfect score", async () => {
    deps.quizRepo.seed(makeQuiz());

    const result = await processQuizAttempt(deps, {
      quizId: QUIZ_ID,
      userId: USER_ID,
      body: {
        answers: [
          { questionId: "q1", selectedOptionId: "o1" },
          { questionId: "q2", selectedOptionId: "o3" },
          { questionId: "q3", selectedOptionId: "o5" },
        ],
      },
    });

    expect(result).toMatchObject({
      ok: true,
      status: 200,
      value: {
        score: 100,
        passed: true,
        xpAwarded: 20,
      },
    });
  });

  it("persists the attempt as completed on a passing attempt", async () => {
    deps.quizRepo.seed(makeQuiz());

    const result = await processQuizAttempt(deps, {
      quizId: QUIZ_ID,
      userId: USER_ID,
      body: {
        answers: [
          { questionId: "q1", selectedOptionId: "o1" },
          { questionId: "q2", selectedOptionId: "o3" },
          { questionId: "q3", selectedOptionId: "o5" },
        ],
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.attempt.status).toBe("completed");
  });

  // ── partial answer ────────────────────────────────────────

  it("returns 200 with score=null, passed=null for an in-progress attempt (not all answered)", async () => {
    deps.quizRepo.seed(makeQuiz());

    const result = await processQuizAttempt(deps, {
      quizId: QUIZ_ID,
      userId: USER_ID,
      body: {
        answers: [
          { questionId: "q1", selectedOptionId: "o1" },
          { questionId: "q2", selectedOptionId: "o3" },
          // q3 not answered
        ],
      },
    });

    expect(result).toMatchObject({
      ok: true,
      status: 200,
      value: {
        score: null,
        passed: null,
        xpAwarded: 0,
      },
    });
  });

  // ── failing score ─────────────────────────────────────────

  it("returns passed=false and xpAwarded=0 for a score below passingScore", async () => {
    deps.quizRepo.seed(makeQuiz());

    const result = await processQuizAttempt(deps, {
      quizId: QUIZ_ID,
      userId: USER_ID,
      body: {
        answers: [
          { questionId: "q1", selectedOptionId: "o1" }, // correct
          { questionId: "q2", selectedOptionId: "o4" }, // wrong
          { questionId: "q3", selectedOptionId: "o6" }, // wrong
        ],
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.passed).toBe(false);
    expect(result.value.score).toBe(33); // 1 of 3 correct
    expect(result.value.xpAwarded).toBe(0);
  });

  // ── quiz not found ────────────────────────────────────────

  it("returns 404 with error=quiz_not_found when the quiz does not exist", async () => {
    const result = await processQuizAttempt(deps, {
      quizId: "nonexistent",
      userId: USER_ID,
      body: {
        answers: [{ questionId: "q1", selectedOptionId: "o1" }],
      },
    });

    expect(result).toEqual({
      ok: false,
      status: 404,
      error: { kind: "quiz_not_found" },
    });
  });

  // ── invalid answer: questionId ────────────────────────────

  it("returns 400 with invalid_answer when questionId is not in the quiz", async () => {
    deps.quizRepo.seed(makeQuiz());

    const result = await processQuizAttempt(deps, {
      quizId: QUIZ_ID,
      userId: USER_ID,
      body: {
        answers: [{ questionId: "nonexistent-q", selectedOptionId: "o1" }],
      },
    });

    expect(result).toEqual({
      ok: false,
      status: 400,
      error: {
        kind: "invalid_answer",
        questionId: "nonexistent-q",
        reason: "question not found",
      },
    });
  });

  // ── invalid answer: optionId ──────────────────────────────

  it("returns 400 with invalid_answer when optionId is not in the question", async () => {
    deps.quizRepo.seed(makeQuiz());

    const result = await processQuizAttempt(deps, {
      quizId: QUIZ_ID,
      userId: USER_ID,
      body: {
        answers: [{ questionId: "q1", selectedOptionId: "nonexistent-o" }],
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(400);
    expect(result.error).toMatchObject({
      kind: "invalid_answer",
      questionId: "q1",
    });
  });

  // ── validation: empty answers ─────────────────────────────

  it("returns 400 with validation_error when answers is empty", async () => {
    deps.quizRepo.seed(makeQuiz());

    const result = await processQuizAttempt(deps, {
      quizId: QUIZ_ID,
      userId: USER_ID,
      body: { answers: [] },
    });

    expect(result).toEqual({
      ok: false,
      status: 400,
      error: { kind: "validation_error", message: "answers must not be empty" },
    });
  });

  it("returns 400 with validation_error when body shape is wrong", async () => {
    const result = await processQuizAttempt(deps, {
      quizId: QUIZ_ID,
      userId: USER_ID,
      body: { answers: [{ questionId: "q1" }] }, // missing selectedOptionId
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(400);
    expect(result.error).toMatchObject({ kind: "validation_error" });
  });

  // ── auth ──────────────────────────────────────────────────

  it("returns 401 when userId is missing (no authenticated user)", async () => {
    deps.quizRepo.seed(makeQuiz());

    const result = await processQuizAttempt(deps, {
      quizId: QUIZ_ID,
      userId: "",
      body: {
        answers: [{ questionId: "q1", selectedOptionId: "o1" }],
      },
    });

    expect(result).toEqual({
      ok: false,
      status: 401,
      error: { kind: "unauthorized" },
    });
  });

  // ── XP fire-and-forget ────────────────────────────────────

  it("does not fail the request when XP award fails (fire-and-forget)", async () => {
    deps.quizRepo.seed(makeQuiz());

    // Use a user repo whose updateTotalXp returns an error — AwardXP
    // will fail, but the quiz attempt result should still come back 200.
    vi.spyOn(deps.userRepo, "updateTotalXp").mockResolvedValue({
      ok: false,
      error: { kind: "db_error", message: "boom" },
    });

    const result = await processQuizAttempt(deps, {
      quizId: QUIZ_ID,
      userId: USER_ID,
      body: {
        answers: [
          { questionId: "q1", selectedOptionId: "o1" },
          { questionId: "q2", selectedOptionId: "o3" },
          { questionId: "q3", selectedOptionId: "o5" },
        ],
      },
    });

    // Wait a tick for the fire-and-forget promise to settle
    await new Promise((r) => setImmediate(r));

    expect(result).toMatchObject({
      ok: true,
      status: 200,
      value: { passed: true, xpAwarded: 20 },
    });
  });
});

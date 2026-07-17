/**
 * InMemoryQuizRepository tests — TDD (red first).
 *
 * STORY-031: Quiz + QuizAttempt models + repositories.
 *
 * These tests describe the desired behavior.
 * Write them first. Run them — they must fail.
 * Then write the minimum implementation to make them pass.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryQuizRepository } from "../InMemoryQuizRepository";
import { createQuiz } from "@/domain/entities/Quiz";
import type { Quiz } from "@/domain/entities/Quiz";

// ── Fixture ────────────────────────────────────────────────────────────────

function makeQuiz(overrides: Partial<{ id: string; courseId: string; title: string }> = {}): Quiz {
  const r = createQuiz({
    id: overrides.id ?? "quiz-1",
    courseId: overrides.courseId ?? "course-1",
    title: overrides.title ?? "Test Quiz",
    passingScore: 70,
    questions: [
      {
        id: "q1",
        questionText: "What?",
        options: [
          { id: "o1", optionText: "A", isCorrect: true },
          { id: "o2", optionText: "B", isCorrect: false },
        ],
      },
    ],
  });
  if (!r.ok) throw new Error("Fixture creation failed");
  return r.value;
}

// ── RED: create ─────────────────────────────────────────────────────────────

describe("InMemoryQuizRepository", () => {
  let repo: InMemoryQuizRepository;

  beforeEach(() => {
    repo = new InMemoryQuizRepository();
  });

  describe("create", () => {
    it("stores and returns the quiz", async () => {
      const quiz = makeQuiz();
      const result = await repo.create(quiz);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.id).toBe("quiz-1");
    });
  });

  // ── RED: findById ─────────────────────────────────────────────────────────

  describe("findById", () => {
    it("returns the quiz when it exists", async () => {
      const quiz = makeQuiz();
      await repo.create(quiz);
      const result = await repo.findById("quiz-1");
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value?.id).toBe("quiz-1");
    });

    it("returns null when not found", async () => {
      const result = await repo.findById("nonexistent");
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value).toBeNull();
    });
  });

  // ── RED: findByCourseId ────────────────────────────────────────────────────

  describe("findByCourseId", () => {
    it("returns quizzes for the given course", async () => {
      await repo.create(makeQuiz({ id: "quiz-a", courseId: "course-1" }));
      await repo.create(makeQuiz({ id: "quiz-b", courseId: "course-1" }));
      await repo.create(makeQuiz({ id: "quiz-c", courseId: "course-2" }));

      const result = await repo.findByCourseId("course-1");
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value).toHaveLength(2);
    });

    it("returns empty array for a course with no quizzes", async () => {
      const result = await repo.findByCourseId("nonexistent");
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value).toHaveLength(0);
    });
  });

  // ── RED: clear ─────────────────────────────────────────────────────────────

  describe("clear", () => {
    it("removes all quizzes", async () => {
      await repo.create(makeQuiz());
      repo.clear();
      const result = await repo.findById("quiz-1");
      if (!result.ok) return;
      expect(result.value).toBeNull();
    });
  });

  // ── RED: seed ─────────────────────────────────────────────────────────────

  describe("seed", () => {
    it("pre-populates a quiz without calling create", async () => {
      repo.seed(makeQuiz({ id: "seeded-quiz" }));
      const result = await repo.findById("seeded-quiz");
      if (!result.ok) return;
      expect(result.value?.id).toBe("seeded-quiz");
    });
  });
});

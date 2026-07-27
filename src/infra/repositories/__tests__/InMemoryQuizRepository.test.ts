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

  // ── RED: findAll ─────────────────────────────────────────────────────────

  describe("findAll", () => {
    it("returns every quiz across courses", async () => {
      await repo.create(makeQuiz({ id: "quiz-a", courseId: "course-1" }));
      await repo.create(makeQuiz({ id: "quiz-b", courseId: "course-2" }));
      const result = await repo.findAll();
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value).toHaveLength(2);
      expect(result.value.map((q) => q.id).sort()).toEqual(["quiz-a", "quiz-b"]);
    });

    it("returns an empty array when no quizzes exist", async () => {
      const result = await repo.findAll();
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value).toEqual([]);
    });
  });

  // ── RED: update ──────────────────────────────────────────────────────────

  describe("update", () => {
    it("replaces the quiz and returns the new shape", async () => {
      await repo.create(makeQuiz({ id: "quiz-u", title: "Old Title" }));
      const replacement = makeQuiz({ id: "quiz-u", title: "New Title" });
      const result = await repo.update(replacement);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.title).toBe("New Title");
      const refetched = await repo.findById("quiz-u");
      if (!refetched.ok || !refetched.value) throw new Error("expected refetch");
      expect(refetched.value.title).toBe("New Title");
    });

    it("returns not_found when the quiz doesn't exist", async () => {
      const result = await repo.update(makeQuiz({ id: "missing" }));
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.kind).toBe("not_found");
    });
  });

  // ── RED: delete ──────────────────────────────────────────────────────────

  describe("delete", () => {
    it("removes the quiz and returns ok", async () => {
      await repo.create(makeQuiz({ id: "quiz-d" }));
      const result = await repo.delete("quiz-d");
      expect(result.ok).toBe(true);
      const refetched = await repo.findById("quiz-d");
      if (!refetched.ok) return;
      expect(refetched.value).toBeNull();
    });

    it("returns not_found when the quiz doesn't exist", async () => {
      const result = await repo.delete("missing");
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.kind).toBe("not_found");
    });
  });
});

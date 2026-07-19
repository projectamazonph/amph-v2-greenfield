/**
 * InMemoryQuizAttemptRepository tests — TDD (red first).
 *
 * STORY-031: Quiz + QuizAttempt models + repositories.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryQuizAttemptRepository } from "../InMemoryQuizAttemptRepository";
import { startQuizAttempt } from "@/domain/entities/QuizAttempt";
import type { QuizAttempt } from "@/domain/entities/QuizAttempt";

// ── Fixture ────────────────────────────────────────────────────────────────

function makeAttempt(overrides: Partial<{ id: string; userId: string; quizId: string }> = {}): QuizAttempt {
  const r = startQuizAttempt({
    id: overrides.id ?? "attempt-1",
    userId: overrides.userId ?? "user-1",
    quizId: overrides.quizId ?? "quiz-1",
  });
  if (!r.ok) throw new Error("Fixture creation failed");
  return r.value;
}

// ── RED: InMemoryQuizAttemptRepository ────────────────────────────────────

describe("InMemoryQuizAttemptRepository", () => {
  let repo: InMemoryQuizAttemptRepository;

  beforeEach(() => {
    repo = new InMemoryQuizAttemptRepository();
  });

  describe("create", () => {
    it("stores and returns the attempt", async () => {
      const attempt = makeAttempt();
      const result = await repo.create(attempt);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.id).toBe("attempt-1");
    });
  });

  describe("update", () => {
    it("updates an existing attempt", async () => {
      const attempt = makeAttempt();
      await repo.create(attempt);

      const updated: QuizAttempt = {
        ...attempt,
        status: "completed",
        score: 100,
        passed: true,
        completedAt: new Date(),
      };

      const result = await repo.update(updated);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.status).toBe("completed");
      expect(result.value.score).toBe(100);
      expect(result.value.passed).toBe(true);
    });

    it("returns not_found when attempt does not exist (P0-6 contract)", async () => {
      const result = await repo.update(makeAttempt({ id: "new-attempt" }));
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.kind).toBe("not_found");
    });
  });

  describe("findById", () => {
    it("returns the attempt when it exists", async () => {
      const attempt = makeAttempt();
      await repo.create(attempt);
      const result = await repo.findById("attempt-1");
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value?.id).toBe("attempt-1");
    });

    it("returns null when not found", async () => {
      const result = await repo.findById("nonexistent");
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value).toBeNull();
    });
  });

  describe("findByUserAndQuiz", () => {
    it("returns attempts for a user+quiz, newest first", async () => {
      await repo.create(makeAttempt({ id: "attempt-1", userId: "user-1", quizId: "quiz-1" }));
      await repo.create(makeAttempt({ id: "attempt-2", userId: "user-1", quizId: "quiz-1" }));

      const result = await repo.findByUserAndQuiz("user-1", "quiz-1");
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value).toHaveLength(2);
      // Newest first (by startedAt)
      expect(result.value[0]?.id).toBe("attempt-2");
      expect(result.value[1]?.id).toBe("attempt-1");
    });

    it("returns empty array when no attempts exist", async () => {
      const result = await repo.findByUserAndQuiz("user-1", "quiz-1");
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value).toHaveLength(0);
    });
  });

  describe("findLatestByUserAndQuiz", () => {
    it("returns the most recent attempt", async () => {
      await repo.create(makeAttempt({ id: "attempt-1", userId: "user-1", quizId: "quiz-1" }));
      await repo.create(makeAttempt({ id: "attempt-2", userId: "user-1", quizId: "quiz-1" }));

      const result = await repo.findLatestByUserAndQuiz("user-1", "quiz-1");
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value?.id).toBe("attempt-2");
    });

    it("returns null when no attempts exist", async () => {
      const result = await repo.findLatestByUserAndQuiz("user-1", "quiz-1");
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value).toBeNull();
    });
  });

  describe("clear", () => {
    it("removes all attempts", async () => {
      await repo.create(makeAttempt());
      repo.clear();
      const result = await repo.findById("attempt-1");
      if (!result.ok) return;
      expect(result.value).toBeNull();
    });
  });

  describe("seed", () => {
    it("pre-populates an attempt without calling create", async () => {
      repo.seed(makeAttempt({ id: "seeded-attempt" }));
      const result = await repo.findById("seeded-attempt");
      if (!result.ok) return;
      expect(result.value?.id).toBe("seeded-attempt");
    });
  });
});

/**
 * InMemoryAttemptFeedbackRepository tests.
 *
 * STORY-066: Feedback Composer + Remediation Recommendations.
 */

import { describe, it, expect } from "vitest";
import { Result } from "@/domain/shared/Result";
import { InMemoryAttemptFeedbackRepository } from "@/infra/repositories/InMemoryAttemptFeedbackRepository";
import type { AttemptFeedback } from "@/domain/entities/AttemptFeedback";

function makeFeedback(overrides: Partial<AttemptFeedback> = {}): AttemptFeedback {
  return {
    attemptId: "attempt-1",
    userId: "user-1",
    simulatorId: "bid-elevator",
    scenarioId: "scenario-1",
    difficulty: "beginner",
    mode: "practice",
    overallScore: 85,
    passed: true,
    overallComment: "Great work!",
    remediationLinks: ["/courses"],
    dimensionFeedback: [
      {
        dimension: "direction",
        verdict: "good",
        score: 85,
        comment: "Solid work.",
        recommendation: "Keep practicing.",
      },
    ],
    completedAt: new Date("2026-07-24T10:00:00Z"),
    ...overrides,
  } as AttemptFeedback;
}

describe("InMemoryAttemptFeedbackRepository", () => {
  it("create and findByAttemptId happy path", async () => {
    const repo = new InMemoryAttemptFeedbackRepository();
    const feedback = makeFeedback();

    await repo.create(feedback);
    const result = await repo.findByAttemptId("attempt-1");

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value).not.toBeNull();
      expect(result.value!.attemptId).toBe("attempt-1");
      expect(result.value!.passed).toBe(true);
      expect(result.value!.overallScore).toBe(85);
    }
  });

  it("findByAttemptId returns null for missing id", async () => {
    const repo = new InMemoryAttemptFeedbackRepository();
    const result = await repo.findByAttemptId("nonexistent");

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value).toBeNull();
    }
  });

  it("findByUserId returns all feedback for a user", async () => {
    const repo = new InMemoryAttemptFeedbackRepository();

    await repo.create(
      makeFeedback({
        attemptId: "attempt-1",
        userId: "user-1",
        completedAt: new Date("2026-07-24T10:00:00Z"),
      }),
    );
    await repo.create(
      makeFeedback({
        attemptId: "attempt-2",
        userId: "user-1",
        completedAt: new Date("2026-07-24T11:00:00Z"),
      }),
    );
    await repo.create(
      makeFeedback({
        attemptId: "attempt-3",
        userId: "user-2",
        completedAt: new Date("2026-07-24T12:00:00Z"),
      }),
    );

    const result = await repo.findByUserId("user-1");

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.length).toBe(2);
      // Newest first
      expect(result.value[0]!.attemptId).toBe("attempt-2");
      expect(result.value[1]!.attemptId).toBe("attempt-1");
    }
  });

  it("findByUserId with limit returns correct count", async () => {
    const repo = new InMemoryAttemptFeedbackRepository();

    await repo.create(
      makeFeedback({
        attemptId: "attempt-1",
        userId: "user-1",
        completedAt: new Date("2026-07-24T10:00:00Z"),
      }),
    );
    await repo.create(
      makeFeedback({
        attemptId: "attempt-2",
        userId: "user-1",
        completedAt: new Date("2026-07-24T11:00:00Z"),
      }),
    );
    await repo.create(
      makeFeedback({
        attemptId: "attempt-3",
        userId: "user-1",
        completedAt: new Date("2026-07-24T12:00:00Z"),
      }),
    );

    const result = await repo.findByUserId("user-1", 2);

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.length).toBe(2);
    }
  });

  it("findByUserId returns empty array for user with no feedback", async () => {
    const repo = new InMemoryAttemptFeedbackRepository();
    const result = await repo.findByUserId("user-with-no-feedback");

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value).toEqual([]);
    }
  });

  it("create fails if attemptId already exists (unique constraint)", async () => {
    const repo = new InMemoryAttemptFeedbackRepository();
    const feedback = makeFeedback({ attemptId: "duplicate-attempt" });

    await repo.create(feedback);
    const result = await repo.create(feedback);

    expect(Result.isErr(result)).toBe(true);
    if (Result.isErr(result)) {
      expect(result.error.kind).toBe("db_error");
      expect(result.error.message).toContain("already exists");
    }
  });
});

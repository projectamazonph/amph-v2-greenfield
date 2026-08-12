import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  findByAttemptId: vi.fn(),
  grade: vi.fn(),
  compose: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getSessionUser: mocks.getSessionUser }));
vi.mock("@/composition/container", () => ({
  buildContainer: () => ({
    simulatorAttemptRepo: { findByAttemptId: mocks.findByAttemptId },
    gradeSimulatorAttempt: { execute: mocks.grade },
    composeAttemptFeedback: { execute: mocks.compose },
  }),
}));

import { gradeSimulatorAttemptAction } from "../gradeSimulatorAttempt.action";
import { composeAttemptFeedbackAction } from "../composeAttemptFeedback.action";

describe("simulator grading actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSessionUser.mockResolvedValue({ id: "student-1", role: "STUDENT" });
    mocks.findByAttemptId.mockResolvedValue({ ok: true, value: { userId: "student-1" } });
    mocks.grade.mockResolvedValue({
      ok: true,
      value: {
        attemptId: "ATT-1",
        overallScore: 80,
        scoreDimensions: { direction: 80 },
        isPassed: true,
        gradedAt: new Date("2026-08-13T00:00:00.000Z"),
      },
    });
    mocks.compose.mockResolvedValue({
      ok: true,
      value: {
        feedback: {
          attemptId: "ATT-1",
          userId: "student-1",
          simulatorId: "listing-audit",
          scenarioId: "scenario-1",
          difficulty: "beginner",
          mode: "practice",
          overallScore: 80,
          passed: true,
          overallComment: "Good work",
          remediationLinks: [],
          dimensionFeedback: [],
          completedAt: new Date("2026-08-13T00:00:00.000Z"),
        },
      },
    });
  });

  it("rejects unauthenticated grading", async () => {
    mocks.getSessionUser.mockResolvedValue(null);
    const form = new FormData();
    form.set("attemptId", "ATT-1");
    form.set("scoreDimensions", JSON.stringify({ direction: 80 }));
    await expect(gradeSimulatorAttemptAction(undefined, form)).resolves.toEqual({
      error: "unauthenticated",
    });
    expect(mocks.grade).not.toHaveBeenCalled();
  });

  it("rejects grading another user's attempt", async () => {
    mocks.findByAttemptId.mockResolvedValue({ ok: true, value: { userId: "student-2" } });
    const form = new FormData();
    form.set("attemptId", "ATT-1");
    form.set("scoreDimensions", JSON.stringify({ direction: 100 }));
    await expect(gradeSimulatorAttemptAction(undefined, form)).resolves.toEqual({
      error: "forbidden",
    });
    expect(mocks.grade).not.toHaveBeenCalled();
  });

  it("allows grading an owned attempt", async () => {
    const form = new FormData();
    form.set("attemptId", "ATT-1");
    form.set("scoreDimensions", JSON.stringify({ direction: 80 }));
    await expect(gradeSimulatorAttemptAction(undefined, form)).resolves.toMatchObject({
      attemptId: "ATT-1",
      isPassed: true,
    });
  });

  it("rejects unauthenticated feedback", async () => {
    mocks.getSessionUser.mockResolvedValue(null);
    const form = new FormData();
    form.set("attemptId", "ATT-1");
    await expect(composeAttemptFeedbackAction(undefined, form)).resolves.toEqual({
      error: "unauthenticated",
    });
    expect(mocks.compose).not.toHaveBeenCalled();
  });

  it("rejects feedback for another user's attempt", async () => {
    mocks.findByAttemptId.mockResolvedValue({ ok: true, value: { userId: "student-2" } });
    const form = new FormData();
    form.set("attemptId", "ATT-1");
    await expect(composeAttemptFeedbackAction(undefined, form)).resolves.toEqual({
      error: "forbidden",
    });
    expect(mocks.compose).not.toHaveBeenCalled();
  });
});

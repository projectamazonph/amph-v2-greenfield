/**
 * str-triage actions — server action contract tests.
 *
 * STORY-067: STR Triage Rebuild (Scoring Engine Integration).
 *
 * Tests both the new strTriageAttempt() lifecycle function and the
 * legacy classifyStr() backward-compatibility wrapper.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Result } from "@/domain/shared/Result";
vi.mock("server-only", () => ({}));

// ── Module mocking ─────────────────────────────────────────────────────
// We mock the composition container so we can inject fake dependencies
// without needing a real DATABASE_URL.

vi.mock("@/composition/container", () => ({
  getContainer: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSessionUserId: vi.fn(),
}));

import { getContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import type { SimulatorAttempt } from "@/domain/entities/SimulatorAttempt";
import type { StrTriageOutput } from "@/domain/simulator/str-triage/StrTriageOutput";
import { strTriageAttempt, classifyStr } from "../actions";

const mockContainer = {
  startSimulatorAttempt: {
    execute: vi.fn(),
  },
  saveSimulatorDecision: {
    execute: vi.fn(),
  },
  gradeSimulatorAttempt: {
    execute: vi.fn(),
  },
  composeAttemptFeedback: {
    execute: vi.fn(),
  },
  submitSimulatorAttempt: {
    execute: vi.fn(),
  },
  simulatorRegistry: {
    get: vi.fn(),
  },
};

const fakeSimulator = {
  simulatorId: "str-triage" as const,
  name: "STR Triage",
  run: vi.fn(),
};

// ── Fixtures ────────────────────────────────────────────────────────────

const GRADED_ATTEMPT: SimulatorAttempt = {
  id: "sys-attempt-1",
  attemptId: "ATT-ABC123",
  userId: "system",
  simulatorId: "str-triage",
  scenarioId: "str-triage-scenario-kitchen-products",
  scenarioVersion: 1,
  difficulty: "beginner",
  mode: "practice",
  status: "graded",
  seed: "SEED1234",
  score: 85,
  scoreDimensions: { direction: 85, profitability: 90, reviewCoverage: 100, explanation: 100 },
  startedAt: new Date(),
  submittedAt: new Date(),
  gradedAt: new Date(),
  decisions: [],
};

const SIM_OUTPUT: StrTriageOutput = {
  classifications: [
    {
      keyword: "stainless steel knife set",
      groundTruth: "keep",
      userChoice: "keep",
      roas: 4.0,
      spend: 120,
      isCorrect: true,
    },
    {
      keyword: "knife set",
      groundTruth: "pause",
      userChoice: "keep",
      roas: 3.0,
      spend: 95,
      isCorrect: false,
    },
  ],
  scoreDimensions: {
    direction: 50,
    profitability: 85,
    reviewCoverage: 100,
  },
  score: 50,
};

function happyContainer() {
  const c = mockContainer as typeof mockContainer & {
    startSimulatorAttempt: { execute: ReturnType<typeof vi.fn> };
    saveSimulatorDecision: { execute: ReturnType<typeof vi.fn> };
    gradeSimulatorAttempt: { execute: ReturnType<typeof vi.fn> };
    composeAttemptFeedback: { execute: ReturnType<typeof vi.fn> };
    submitSimulatorAttempt: { execute: ReturnType<typeof vi.fn> };
    simulatorRegistry: { get: ReturnType<typeof vi.fn> };
  };
  c.startSimulatorAttempt.execute.mockResolvedValue(
    Result.ok({ attemptId: "ATT-ABC123", startedAt: new Date() }),
  );
  c.saveSimulatorDecision.execute.mockResolvedValue(Result.ok({}));
  c.gradeSimulatorAttempt.execute.mockResolvedValue(
    Result.ok({
      attemptId: "ATT-ABC123",
      overallScore: 85,
      scoreDimensions: { direction: 85, profitability: 90, reviewCoverage: 100, explanation: 100 },
      isPassed: true,
      gradedAt: new Date(),
    }),
  );
  c.composeAttemptFeedback.execute.mockResolvedValue(
    Result.ok({
      feedback: {
        attemptId: "ATT-ABC123",
        userId: "system",
        simulatorId: "str-triage",
        scenarioId: "str-triage-scenario-kitchen-products",
        difficulty: "beginner",
        mode: "practice",
        overallScore: 85,
        passed: true,
        overallComment: "Excellent prioritization.",
        remediationLinks: ["/courses", "/dashboard"],
        dimensionFeedback: [],
        completedAt: new Date(),
      },
    }),
  );
  c.submitSimulatorAttempt.execute.mockResolvedValue(
    Result.ok({ status: "submitted", submittedAt: new Date() }),
  );
  c.simulatorRegistry.get.mockReturnValue(fakeSimulator);
  (fakeSimulator.run as ReturnType<typeof vi.fn>).mockResolvedValue(SIM_OUTPUT);
}

// ── strTriageAttempt tests ─────────────────────────────────────────────

describe("strTriageAttempt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getContainer as ReturnType<typeof vi.fn>).mockReturnValue(mockContainer);
    (getSessionUserId as ReturnType<typeof vi.fn>).mockResolvedValue("user_123");
    happyContainer();
  });

  it("returns unauthorized when user is not authenticated", async () => {
    (getSessionUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const result = await strTriageAttempt({
      rows: [{ keyword: "wireless earbuds", spend: 10, revenue: 30, orders: 2 }],
      targetRoas: 3,
      userActions: { "wireless earbuds": "keep" },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("unauthorized");
  });

  it("returns validation_error when rows is missing", async () => {
    const result = await strTriageAttempt({ targetRoas: 3, userActions: {} });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("validation_error");
  });

  it("returns validation_error when rows is empty", async () => {
    const result = await strTriageAttempt({ rows: [], targetRoas: 3, userActions: {} });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("validation_error");
    expect((result.error as { message: string }).message).toContain("non-empty");
  });

  it("returns validation_error when targetRoas is not positive", async () => {
    const result = await strTriageAttempt({
      rows: [{ keyword: "a", spend: 1, revenue: 3, orders: 1 }],
      targetRoas: 0,
      userActions: {},
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("validation_error");
  });

  it("returns validation_error for unknown action", async () => {
    const result = await strTriageAttempt({
      rows: [{ keyword: "a", spend: 1, revenue: 3, orders: 1 }],
      targetRoas: 3,
      userActions: { a: "shrug" as never },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("validation_error");
  });

  it("happy path: starts attempt, grades, composes feedback, returns result", async () => {
    const result = await strTriageAttempt({
      rows: [{ keyword: "a", spend: 1, revenue: 3, orders: 1 }],
      targetRoas: 3,
      userActions: { a: "keep" },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.attemptId).toBe("ATT-ABC123");
    expect(result.value.overallScore).toBe(85);
    expect(result.value.isPassed).toBe(true);
    expect(result.value.feedback.passed).toBe(true);
    expect(result.value.feedback.overallComment).toBe("Excellent prioritization.");

    expect(mockContainer.startSimulatorAttempt.execute).toHaveBeenCalled();
    expect(mockContainer.gradeSimulatorAttempt.execute).toHaveBeenCalled();
    expect(mockContainer.composeAttemptFeedback.execute).toHaveBeenCalledWith({
      attemptId: "ATT-ABC123",
    });
    expect(mockContainer.submitSimulatorAttempt.execute).toHaveBeenCalled();
  });

  it("returns attempt_error when startSimulatorAttempt fails", async () => {
    (mockContainer.startSimulatorAttempt.execute as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      Result.err({ kind: "attempt_not_found" }),
    );

    const result = await strTriageAttempt({
      rows: [{ keyword: "a", spend: 1, revenue: 3, orders: 1 }],
      targetRoas: 3,
      userActions: { a: "keep" },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("attempt_error");
  });

  it("returns grading_error when gradeSimulatorAttempt fails", async () => {
    (mockContainer.gradeSimulatorAttempt.execute as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      Result.err({ kind: "policy_not_found" }),
    );

    const result = await strTriageAttempt({
      rows: [{ keyword: "a", spend: 1, revenue: 3, orders: 1 }],
      targetRoas: 3,
      userActions: { a: "keep" },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("grading_error");
  });

  it("returns feedback_error when composeAttemptFeedback fails", async () => {
    (
      mockContainer.composeAttemptFeedback.execute as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce(Result.err({ kind: "attempt_not_found" }));

    const result = await strTriageAttempt({
      rows: [{ keyword: "a", spend: 1, revenue: 3, orders: 1 }],
      targetRoas: 3,
      userActions: { a: "keep" },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("feedback_error");
  });

  it("includes per-classification results in the response", async () => {
    const result = await strTriageAttempt({
      rows: [{ keyword: "a", spend: 1, revenue: 3, orders: 1 }],
      targetRoas: 3,
      userActions: { a: "keep" },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.classifications).toHaveLength(2);
    expect(result.value.classifications[0]!.keyword).toBe("stainless steel knife set");
    expect(result.value.classifications[0]!.groundTruth).toBe("keep");
    expect(result.value.classifications[0]!.isCorrect).toBe(true);
  });
});

// ── classifyStr legacy tests ──────────────────────────────────────────

describe("classifyStr (legacy)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getContainer as ReturnType<typeof vi.fn>).mockReturnValue(mockContainer);
    happyContainer();
  });

  it("returns invalid_input when rows is empty", async () => {
    const result = await classifyStr({ rows: [], targetRoas: 3 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("invalid_input");
  });

  it("returns invalid_input when targetRoas is 0", async () => {
    const result = await classifyStr({
      rows: [{ keyword: "a", spend: 1, revenue: 3, orders: 1, action: "keep" }],
      targetRoas: 0,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("invalid_input");
  });

  it("returns a 0-100 score for valid input", async () => {
    const result = await classifyStr({
      rows: [{ keyword: "a", spend: 1, revenue: 3, orders: 1, action: "keep" }],
      targetRoas: 3,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.score).toBeGreaterThanOrEqual(0);
    expect(result.value.score).toBeLessThanOrEqual(100);
  });
});

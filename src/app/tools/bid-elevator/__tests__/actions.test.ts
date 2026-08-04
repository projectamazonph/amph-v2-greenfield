/**
 * bid-elevator actions — server action contract tests.
 *
 * STORY-079: Bid Elevator economic model rewrite.
 *
 * STORY-085: bidElevatorAttempt() no longer accepts scenario economics
 * from the client — it resolves the currently published bid-elevator
 * scenario server-side via scenarioRepo.findPublished(). The legacy
 * runBidElevator() wrapper (which never persisted a SimulatorAttempt) is
 * removed.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Result } from "@/domain/shared/Result";
vi.mock("server-only", () => ({}));

// ── Module mocking ─────────────────────────────────────────────────────

vi.mock("@/composition/container", () => ({
  buildContainer: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSessionUserId: vi.fn(),
}));

import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import type { BidElevatorOutput } from "@/domain/simulator/bid-elevator/BidElevatorOutput";
import type { BidElevatorKeywordScenario } from "@/domain/simulator/bid-elevator/BidElevatorInput";
import { bidElevatorAttempt } from "../actions";

const mockContainer = {
  startSimulatorAttempt: { execute: vi.fn() },
  gradeSimulatorAttempt: { execute: vi.fn() },
  composeAttemptFeedback: { execute: vi.fn() },
  simulatorRegistry: { get: vi.fn() },
  scenarioRepo: { findPublished: vi.fn() },
};

const fakeSimulator = {
  simulatorId: "bid-elevator" as const,
  name: "Bid Elevator",
  run: vi.fn(),
};

// ── Fixtures ──────────────────────────────────────────────────────────

function keyword(overrides: Partial<BidElevatorKeywordScenario> = {}): BidElevatorKeywordScenario {
  return {
    keywordId: "kw1",
    keyword: "running shoes",
    matchType: "exact",
    intent: "generic",
    strategicRole: "performance",
    currentBid: 1.0,
    baselineBid: 1.0,
    baselineCtrPct: 2,
    baselineCvrPct: 10,
    benchmarkCpc: 0.8,
    availableImpressionsPerDay: 1000,
    maxImpressionSharePct: 40,
    bidElasticity: 1.5,
    evidenceClicks: 40,
    evidenceOrders: 5,
    evidenceWindowDays: 30,
    ...overrides,
  };
}

const SCENARIO_BASE = {
  currencyCode: "USD",
  dailyBudget: 50,
  simulationDays: 1,
  targetRoas: 3.0,
  breakEvenAcosPct: 45,
  defaultRevenuePerOrder: 30,
  minimumBidIncrement: 0.05,
};

const PUBLISHED_SCENARIO = {
  id: "bid-elevator-scenario-default",
  scenarioKey: "bid-elevator-scenario-default",
  version: 1,
  status: "published" as const,
  simulatorId: "bid-elevator" as const,
  name: "Reduce ACoS on a high-spend electronics campaign",
  description: "Wireless earbuds campaign spending ₱800/day at 45% ACoS; target is 25%.",
  inputSchema: {
    ...SCENARIO_BASE,
    keywords: [keyword(), keyword({ keywordId: "kw2", keyword: "jogging shoes" })],
  },
  outputSchema: {},
  difficulty: "intermediate" as const,
  estimatedMinutes: 10,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const SIM_OUTPUT: BidElevatorOutput = {
  bids: [
    {
      keywordId: "kw1",
      keyword: "running shoes",
      matchType: "exact",
      intent: "generic",
      strategicRole: "performance",
      groundTruth: 1.2,
      currentBid: 1.0,
      benchmarkCpc: 0.8,
      economicCeiling: 1.5,
      estimatedImpressions: 500,
      estimatedClicks: 10,
      estimatedCpc: 0.8,
      estimatedSpend: 8,
      estimatedOrders: 1,
      estimatedSales: 30,
      keywordRoas: 3.75,
      confidence: "high",
      userBid: 1.2,
      isCorrect: true,
    },
  ],
  estimatedSpend: 25,
  estimatedRoas: 3.0,
  score: 50,
  scoreDimensions: {
    bidAccuracy: 50,
    budgetAdherence: 100,
    roasHit: 100,
  },
};

function happyContainer() {
  const c = mockContainer as typeof mockContainer & {
    startSimulatorAttempt: { execute: ReturnType<typeof vi.fn> };
    gradeSimulatorAttempt: { execute: ReturnType<typeof vi.fn> };
    composeAttemptFeedback: { execute: ReturnType<typeof vi.fn> };
    simulatorRegistry: { get: ReturnType<typeof vi.fn> };
  };
  c.startSimulatorAttempt.execute.mockResolvedValue(
    Result.ok({ attemptId: "ATT-BID001", startedAt: new Date() }),
  );
  c.gradeSimulatorAttempt.execute.mockResolvedValue(
    Result.ok({
      attemptId: "ATT-BID001",
      overallScore: 80,
      scoreDimensions: { bidAccuracy: 50, budgetAdherence: 100, roasHit: 100 },
      isPassed: true,
      gradedAt: new Date(),
    }),
  );
  c.composeAttemptFeedback.execute.mockResolvedValue(
    Result.ok({
      feedback: {
        attemptId: "ATT-BID001",
        userId: "user_123",
        simulatorId: "bid-elevator",
        scenarioId: "bid-elevator-scenario-default",
        difficulty: "beginner",
        mode: "practice",
        overallScore: 50,
        passed: true,
        overallComment: "Solid bid management.",
        remediationLinks: ["/courses/ppc-101"],
        dimensionFeedback: [],
        completedAt: new Date(),
      },
    }),
  );
  c.simulatorRegistry.get.mockReturnValue(fakeSimulator);
  mockContainer.scenarioRepo.findPublished.mockResolvedValue(Result.ok(PUBLISHED_SCENARIO));
  fakeSimulator.run.mockImplementation(
    async (input: { userBidAdjustments?: Record<string, number> }) => ({
      ...SIM_OUTPUT,
      scoreDimensions: input.userBidAdjustments !== undefined ? SIM_OUTPUT.scoreDimensions : null,
      score: input.userBidAdjustments !== undefined ? 50 : 100,
    }),
  );
}

function setupGetContainer() {
  (buildContainer as ReturnType<typeof vi.fn>).mockReturnValue(mockContainer);
}

beforeEach(() => {
  vi.clearAllMocks();
  setupGetContainer();
  (getSessionUserId as ReturnType<typeof vi.fn>).mockResolvedValue("user_123");
});

// ── bidElevatorAttempt tests ───────────────────────────────────────────

describe("bidElevatorAttempt", () => {
  it("returns unauthorized when user is not authenticated", async () => {
    (getSessionUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const result = await bidElevatorAttempt({ userBidAdjustments: { kw1: 1.2 } });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("unauthorized");
  });

  const validInput = {
    userBidAdjustments: { kw1: 1.2, kw2: 2.5 },
  };

  it("returns validation_error for a malformed userBidAdjustments entry", async () => {
    const result = await bidElevatorAttempt({ userBidAdjustments: { kw1: -1 } });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("validation_error");
  });

  it("returns attempt_error when no published scenario exists", async () => {
    happyContainer();
    mockContainer.scenarioRepo.findPublished.mockResolvedValueOnce(Result.ok(null));
    const result = await bidElevatorAttempt(validInput);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("attempt_error");
  });

  it("happy path: starts attempt, grades, composes feedback, returns result", async () => {
    happyContainer();
    const result = await bidElevatorAttempt(validInput);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(mockContainer.startSimulatorAttempt.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        simulatorId: "bid-elevator",
        mode: "practice",
        scenarioId: "bid-elevator-scenario-default",
      }),
    );

    expect(fakeSimulator.run).toHaveBeenCalledWith(
      expect.objectContaining({ dailyBudget: 50, targetRoas: 3.0 }),
    );

    expect(mockContainer.gradeSimulatorAttempt.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        attemptId: "ATT-BID001",
        scoreDimensions: expect.objectContaining({ bidAccuracy: 50, roasHit: 100 }),
      }),
    );

    expect(mockContainer.composeAttemptFeedback.execute).toHaveBeenCalledWith({
      attemptId: "ATT-BID001",
    });

    expect(result.value.attemptId).toBe("ATT-BID001");
    expect(result.value.overallScore).toBe(50);
    expect(result.value.scoreDimensions).not.toBeNull();
    expect(result.value.isPassed).toBe(true); // bidAccuracy 50 >= 50 threshold
    expect(result.value.feedback).not.toBeNull();
    expect(result.value.feedback!.passed).toBe(true);
  });

  it("returns attempt_error when startSimulatorAttempt fails", async () => {
    happyContainer();
    mockContainer.startSimulatorAttempt.execute.mockResolvedValue(
      Result.err({ kind: "db_error", message: "connection failed" }),
    );
    const result = await bidElevatorAttempt(validInput);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("attempt_error");
  });

  it("returns grading_error when gradeSimulatorAttempt fails", async () => {
    happyContainer();
    mockContainer.gradeSimulatorAttempt.execute.mockResolvedValue(
      Result.err({ kind: "policy_not_found" }),
    );
    const result = await bidElevatorAttempt(validInput);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("grading_error");
  });

  it("returns feedback_error when composeAttemptFeedback fails", async () => {
    happyContainer();
    mockContainer.composeAttemptFeedback.execute.mockResolvedValue(
      Result.err({ kind: "attempt_not_found" }),
    );
    const result = await bidElevatorAttempt(validInput);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("feedback_error");
  });

  it("includes per-bid results in the response", async () => {
    happyContainer();
    const result = await bidElevatorAttempt(validInput);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.bids).toHaveLength(1);
    expect(result.value.bids[0]!.keyword).toBe("running shoes");
    expect(result.value.bids[0]!.groundTruth).toBe(1.2);
    expect(result.value.bids[0]!.userBid).toBe(1.2);
    expect(result.value.bids[0]!.isCorrect).toBe(true);
  });

  it("preview mode (no userBidAdjustments) skips grading and feedback", async () => {
    happyContainer();
    const result = await bidElevatorAttempt({});
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(mockContainer.gradeSimulatorAttempt.execute).not.toHaveBeenCalled();
    expect(mockContainer.composeAttemptFeedback.execute).not.toHaveBeenCalled();
    expect(result.value.scoreDimensions).toBeNull();
    expect(result.value.feedback).toBeNull();
    expect(result.value.isPassed).toBe(false);
  });

  it("uses the published scenario's id in startSimulatorAttempt, not client input", async () => {
    happyContainer();
    await bidElevatorAttempt({ ...validInput, mode: "challenge" });
    expect(mockContainer.startSimulatorAttempt.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        scenarioId: "bid-elevator-scenario-default",
        mode: "challenge",
      }),
    );
  });

  it("defaults mode to 'practice' when not provided", async () => {
    happyContainer();
    await bidElevatorAttempt(validInput);
    expect(mockContainer.startSimulatorAttempt.execute).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "practice" }),
    );
  });
});

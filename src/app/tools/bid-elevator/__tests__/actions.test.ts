/**
 * bid-elevator actions — server action contract tests.
 *
 * STORY-068: Bid Elevator Rebuild (Scoring Engine Integration).
 *
 * Tests both the new bidElevatorAttempt() lifecycle function and the
 * legacy runBidElevator() backward-compatibility wrapper.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Result } from "@/domain/shared/Result";
vi.mock("server-only", () => ({}));

// ── Module mocking ─────────────────────────────────────────────────────

vi.mock("@/composition/container", () => ({
  getContainer: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSessionUserId: vi.fn(),
}));

import { getContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import type { SimulatorAttempt } from "@/domain/entities/SimulatorAttempt";
import type { BidElevatorOutput } from "@/domain/simulator/bid-elevator/BidElevatorOutput";
import { bidElevatorAttempt, runBidElevator } from "../actions";

const mockContainer = {
  startSimulatorAttempt: { execute: vi.fn() },
  gradeSimulatorAttempt: { execute: vi.fn() },
  composeAttemptFeedback: { execute: vi.fn() },
  simulatorRegistry: { get: vi.fn() },
};

const fakeSimulator = {
  simulatorId: "bid-elevator" as const,
  name: "Bid Elevator",
  run: vi.fn(),
};

// ── Fixtures ──────────────────────────────────────────────────────────

const GRADED_ATTEMPT: SimulatorAttempt = {
  id: "sys-attempt-1",
  attemptId: "ATT-BID001",
  userId: "system",
  simulatorId: "bid-elevator",
  scenarioId: "bid-elevator-scenario-default",
  scenarioVersion: 1,
  difficulty: "beginner",
  mode: "practice",
  status: "graded",
  seed: "SEED9999",
  score: 80,
  scoreDimensions: {
    bidAccuracy: 80,
    budgetAdherence: 90,
    roasHit: 100,
  },
  startedAt: new Date(),
  submittedAt: new Date(),
  gradedAt: new Date(),
  decisions: [],
};

const SIM_OUTPUT: BidElevatorOutput = {
  bids: [
    {
      keyword: "running shoes",
      groundTruth: 1.2,
      currentBid: 1.0,
      estimatedCpc: 0.8,
      volume: 1000,
      userBid: 1.2,
      isCorrect: true,
    },
    {
      keyword: "jogging shoes",
      groundTruth: 0.9,
      currentBid: 0.8,
      estimatedCpc: 0.6,
      volume: 500,
      userBid: 2.5,
      isCorrect: false,
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
      scoreDimensions: { bidAccuracy: 80, budgetAdherence: 90, roasHit: 100, explanation: 100 },
      isPassed: true,
      gradedAt: new Date(),
    }),
  );
  c.composeAttemptFeedback.execute.mockResolvedValue(
    Result.ok({
      feedback: {
        attemptId: "ATT-BID001",
        userId: "system",
        simulatorId: "bid-elevator",
        scenarioId: "bid-elevator-scenario-default",
        difficulty: "beginner",
        mode: "practice",
        overallScore: 80,
        passed: true,
        overallComment: "Solid bid management.",
        remediationLinks: ["/courses/ppc-101"],
        dimensionFeedback: [],
        completedAt: new Date(),
      },
    }),
  );
  c.simulatorRegistry.get.mockReturnValue(fakeSimulator);
  // Dynamic mock: return scoreDimensions only when userBidAdjustments is provided
  // Returns values matching SIM_OUTPUT fixture when user adjustments are present
  fakeSimulator.run.mockImplementation(
    async (input: {
      keywords: readonly { keyword: string; currentBid: number }[];
      userBidAdjustments?: Record<string, number>;
    }) => {
      const hasUserBids = input.userBidAdjustments !== undefined;
      const bids = input.keywords.map((k) => {
        const gt = 1.2; // matches SIM_OUTPUT groundTruth
        const ub = hasUserBids ? input.userBidAdjustments![k.keyword] : undefined;
        return {
          keyword: k.keyword,
          groundTruth: gt,
          currentBid: k.currentBid,
          estimatedCpc: 0.8,
          volume: 1000,
          ...(ub !== undefined ? { userBid: ub, isCorrect: ub === gt } : {}),
        };
      });
      return {
        bids,
        estimatedSpend: 20,
        estimatedRoas: 3.0,
        score: hasUserBids ? 50 : 100, // matches SIM_OUTPUT.score
        scoreDimensions: hasUserBids
          ? { bidAccuracy: 50, budgetAdherence: 100, roasHit: 100, explanation: 100 }
          : null,
      };
    },
  );
}

function setupGetContainer() {
  (getContainer as ReturnType<typeof vi.fn>).mockReturnValue(mockContainer);
}

beforeEach(() => {
  vi.clearAllMocks();
  setupGetContainer();
  // Authenticated by default for existing tests
  (getSessionUserId as ReturnType<typeof vi.fn>).mockResolvedValue("user_123");
});

// ── bidElevatorAttempt tests ───────────────────────────────────────────

describe("bidElevatorAttempt", () => {
  it("returns unauthorized when user is not authenticated", async () => {
    // Override the default auth mock to return null
    (getSessionUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const result = await bidElevatorAttempt({
      keywords: [{ keyword: "running shoes", currentBid: 1.0, currentCpc: 0.8, volume: 1000 }],
      budget: 50,
      targetRoas: 3.0,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("unauthorized");
  });

  const validInput = {
    keywords: [
      { keyword: "running shoes", currentBid: 1.0, currentCpc: 0.8, volume: 1000 },
      { keyword: "jogging shoes", currentBid: 0.8, currentCpc: 0.6, volume: 500 },
    ],
    budget: 50,
    targetRoas: 3.0,
    userBidAdjustments: { "running shoes": 1.2, "jogging shoes": 2.5 },
  };

  it("returns validation_error when keywords is missing", async () => {
    const result = await bidElevatorAttempt({ budget: 50, targetRoas: 3.0 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("validation_error");
  });

  it("returns validation_error when keywords array is empty", async () => {
    const result = await bidElevatorAttempt({ keywords: [], budget: 50, targetRoas: 3.0 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("validation_error");
  });

  it("returns validation_error when budget is not positive", async () => {
    const result = await bidElevatorAttempt({
      keywords: validInput.keywords,
      budget: 0,
      targetRoas: 3.0,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("validation_error");
  });

  it("returns validation_error when targetRoas is not positive", async () => {
    const result = await bidElevatorAttempt({
      keywords: validInput.keywords,
      budget: 50,
      targetRoas: -1,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("validation_error");
  });

  it("happy path: starts attempt, grades, composes feedback, returns result", async () => {
    happyContainer();
    const result = await bidElevatorAttempt(validInput);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // startSimulatorAttempt called
    expect(mockContainer.startSimulatorAttempt.execute).toHaveBeenCalledWith(
      expect.objectContaining({ simulatorId: "bid-elevator", mode: "practice" }),
    );

    // simulator run called
    expect(fakeSimulator.run).toHaveBeenCalledWith(
      expect.objectContaining({ keywords: validInput.keywords, budget: 50, targetRoas: 3.0 }),
    );

    // gradeSimulatorAttempt called
    expect(mockContainer.gradeSimulatorAttempt.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        attemptId: "ATT-BID001",
        scoreDimensions: expect.objectContaining({ bidAccuracy: 50, roasHit: 100 }),
      }),
    );

    // composeAttemptFeedback called
    expect(mockContainer.composeAttemptFeedback.execute).toHaveBeenCalledWith({
      attemptId: "ATT-BID001",
    });

    // response shape
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
    expect(result.value.bids).toHaveLength(2);
    expect(result.value.bids[0]!.keyword).toBe("running shoes");
    expect(result.value.bids[0]!.groundTruth).toBe(1.2);
    expect(result.value.bids[0]!.userBid).toBe(1.2);
    expect(result.value.bids[0]!.isCorrect).toBe(true);
  });

  it("preview mode (no userBidAdjustments) skips grading and feedback", async () => {
    happyContainer();
    const previewInput = {
      keywords: validInput.keywords,
      budget: 50,
      targetRoas: 3.0,
      // no userBidAdjustments
    };
    const result = await bidElevatorAttempt(previewInput);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(mockContainer.gradeSimulatorAttempt.execute).not.toHaveBeenCalled();
    expect(mockContainer.composeAttemptFeedback.execute).not.toHaveBeenCalled();
    expect(result.value.scoreDimensions).toBeNull();
    expect(result.value.feedback).toBeNull();
    expect(result.value.isPassed).toBe(false);
  });

  it("uses provided scenarioId and mode in startSimulatorAttempt", async () => {
    happyContainer();
    await bidElevatorAttempt({
      ...validInput,
      scenarioId: "my-scenario",
      mode: "challenge",
    });
    expect(mockContainer.startSimulatorAttempt.execute).toHaveBeenCalledWith(
      expect.objectContaining({ scenarioId: "my-scenario", mode: "challenge" }),
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

// ── runBidElevator (legacy) tests ─────────────────────────────────────

describe("runBidElevator (legacy)", () => {
  const VALID_KEYWORDS = [
    { keyword: "earbuds", currentBid: 1.0, currentCpc: 0.5, volume: 1000 },
    { keyword: "headphones", currentBid: 1.5, currentCpc: 0.8, volume: 800 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    setupGetContainer();
    mockContainer.simulatorRegistry.get.mockReturnValue(fakeSimulator);
    // Return bids matching all input keywords
    fakeSimulator.run.mockImplementation(
      async (input: { keywords: readonly { keyword: string }[] }) => ({
        bids: input.keywords.map((k) => ({
          keyword: k.keyword,
          groundTruth: 1.0,
          currentBid: 1.0,
          estimatedCpc: 0.5,
          volume: 1000,
        })),
        estimatedSpend: 20,
        estimatedRoas: 3.0,
        score: 100,
        scoreDimensions: null,
      }),
    );
  });

  it("returns invalid_input when keywords is empty", async () => {
    const result = await runBidElevator({ keywords: [], budget: 100, targetRoas: 4 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("invalid_input");
  });

  it("returns invalid_input when budget is 0", async () => {
    const result = await runBidElevator({ keywords: VALID_KEYWORDS, budget: 0, targetRoas: 4 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("invalid_input");
  });

  it("returns invalid_input when targetRoas is not positive", async () => {
    const result = await runBidElevator({ keywords: VALID_KEYWORDS, budget: 100, targetRoas: 0 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("invalid_input");
  });

  it("returns a score in 0-100 for valid input", async () => {
    const result = await runBidElevator({ keywords: VALID_KEYWORDS, budget: 100, targetRoas: 4 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.score).toBeGreaterThanOrEqual(0);
    expect(result.value.score).toBeLessThanOrEqual(100);
  });

  it("returns per-keyword bids matching input keywords", async () => {
    const result = await runBidElevator({ keywords: VALID_KEYWORDS, budget: 100, targetRoas: 4 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const keywords = result.value.bids.map((b) => b.keyword).sort();
    expect(keywords).toEqual(["earbuds", "headphones"]);
  });

  it("scoreDimensions is null in legacy mode (preview only)", async () => {
    const result = await runBidElevator({ keywords: VALID_KEYWORDS, budget: 100, targetRoas: 4 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.scoreDimensions).toBeNull();
  });
});

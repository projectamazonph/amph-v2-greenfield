/**
 * campaign-builder actions — server action contract tests.
 *
 * STORY-069: Campaign Builder Rebuild (Scoring Engine Integration).
 *
 * STORY-085: campaignBuilderAttempt() no longer accepts
 * productCategory/productNiche/monthlyBudget from the client — it
 * resolves the currently published campaign-builder scenario server-side
 * via scenarioRepo.findPublished(). The legacy buildCampaign() wrapper
 * (which never persisted a SimulatorAttempt) is removed.
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
import { campaignBuilderAttempt } from "../actions";

const mockContainer = {
  startSimulatorAttempt: { execute: vi.fn() },
  saveSimulatorDecision: { execute: vi.fn() },
  submitSimulatorAttempt: { execute: vi.fn() },
  gradeSimulatorAttempt: { execute: vi.fn() },
  composeAttemptFeedback: { execute: vi.fn() },
  simulatorRegistry: { get: vi.fn() },
  scenarioRepo: { findPublished: vi.fn() },
  simulatorAttemptRepo: { findByUserAndSimulator: vi.fn() },
  scorePolicyRepo: { findBySimulatorAndDifficulty: vi.fn() },
  awardXp: { execute: vi.fn() },
};

const fakeSimulator = {
  simulatorId: "campaign-builder" as const,
  name: "Campaign Builder",
  run: vi.fn(),
};

// ── Fixtures ──────────────────────────────────────────────────────────

const PUBLISHED_SCENARIO = {
  id: "campaign-builder-scenario-default",
  scenarioKey: "campaign-builder-scenario-default",
  version: 1,
  status: "published" as const,
  simulatorId: "campaign-builder" as const,
  name: "Launch a Sponsored Products campaign for wireless earbuds",
  description: "Build a complete SP campaign with manual targeting and a ₱500/day budget.",
  inputSchema: {
    productCategory: "Electronics",
    productNiche: "wireless earbuds",
    monthlyBudget: 15000,
  },
  outputSchema: {},
  difficulty: "beginner" as const,
  estimatedMinutes: 15,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const GT_CAMPAIGNS: CampaignStructure[] = [
  {
    name: "SP | Manual | wireless earbuds | ₱60/d",
    type: "sponsored-products",
    dailyBudget: 60,
    adGroups: [
      {
        name: "Core - Exact - wireless earbuds",
        keywords: [
          { keyword: "wireless earbuds", matchType: "exact", suggestedBid: 0.4 },
          { keyword: "wireless earbuds for men", matchType: "exact", suggestedBid: 0.4 },
          { keyword: "wireless earbuds for women", matchType: "exact", suggestedBid: 0.4 },
        ],
        suggestedBid: 0.4,
      },
      {
        name: "Discovery - Phrase - wireless earbuds",
        keywords: [
          { keyword: "best wireless earbuds", matchType: "phrase", suggestedBid: 0.32 },
          { keyword: "cheap wireless earbuds", matchType: "phrase", suggestedBid: 0.32 },
        ],
        suggestedBid: 0.32,
      },
    ],
  },
  {
    name: "SP | Auto | wireless earbuds | ₱25/d",
    type: "sponsored-products",
    dailyBudget: 25,
    adGroups: [
      {
        name: "Catch-all - Auto - wireless earbuds",
        keywords: [],
        suggestedBid: 0,
      },
    ],
  },
  {
    name: "SB | Brand | wireless earbuds | ₱15/d",
    type: "sponsored-brands",
    dailyBudget: 15,
    adGroups: [
      {
        name: "Headlines - Brand - wireless earbuds",
        keywords: [],
        suggestedBid: 0,
      },
    ],
  },
];

function happyContainer() {
  const c = mockContainer as typeof mockContainer & {
    startSimulatorAttempt: { execute: ReturnType<typeof vi.fn> };
    saveSimulatorDecision: { execute: ReturnType<typeof vi.fn> };
    submitSimulatorAttempt: { execute: ReturnType<typeof vi.fn> };
    gradeSimulatorAttempt: { execute: ReturnType<typeof vi.fn> };
    composeAttemptFeedback: { execute: ReturnType<typeof vi.fn> };
    simulatorRegistry: { get: ReturnType<typeof vi.fn> };
  };
  c.startSimulatorAttempt.execute.mockResolvedValue(
    Result.ok({ attemptId: "ATT-CB001", startedAt: new Date() }),
  );
  c.saveSimulatorDecision.execute.mockResolvedValue(Result.ok(undefined));
  c.submitSimulatorAttempt.execute.mockResolvedValue(
    Result.ok({ status: "submitted", submittedAt: new Date() }),
  );
  c.gradeSimulatorAttempt.execute.mockResolvedValue(
    Result.ok({
      attemptId: "ATT-CB001",
      overallScore: 80,
      scoreDimensions: {
        structureQuality: 80,
        budgetAllocation: 90,
        keywordRelevance: 70,
      },
      isPassed: true,
      gradedAt: new Date(),
    }),
  );
  c.composeAttemptFeedback.execute.mockResolvedValue(
    Result.ok({
      feedback: {
        attemptId: "ATT-CB001",
        userId: "user_123",
        simulatorId: "campaign-builder",
        scenarioId: "campaign-builder-scenario-default",
        difficulty: "beginner",
        mode: "practice",
        overallScore: 80,
        passed: true,
        overallComment: "Well-structured campaigns.",
        remediationLinks: ["/courses/ppc-101"],
        dimensionFeedback: [],
        completedAt: new Date(),
      },
    }),
  );
  c.simulatorRegistry.get.mockReturnValue(fakeSimulator);
  mockContainer.scenarioRepo.findPublished.mockResolvedValue(Result.ok(PUBLISHED_SCENARIO));
  mockContainer.simulatorAttemptRepo.findByUserAndSimulator.mockResolvedValue(Result.ok([]));
  mockContainer.awardXp.execute.mockResolvedValue(
    Result.ok({ xpEvent: { id: "xpe_1" }, totalXp: 100 }),
  );
  fakeSimulator.run.mockImplementation(
    async (input: { userAdjustedCampaigns?: CampaignStructure[] }) => ({
      campaigns: GT_CAMPAIGNS,
      score: input.userAdjustedCampaigns !== undefined ? 80 : 90,
      scoreDimensions:
        input.userAdjustedCampaigns !== undefined
          ? { structureQuality: 80, budgetAllocation: 90, keywordRelevance: 70, explanation: 100 }
          : null,
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

// ── campaignBuilderAttempt tests ───────────────────────────────────────

describe("campaignBuilderAttempt", () => {
  it("returns unauthorized when user is not authenticated", async () => {
    (getSessionUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const result = await campaignBuilderAttempt({
      targetingStrategy: "hybrid",
      userAdjustedCampaigns: GT_CAMPAIGNS,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("unauthorized");
  });

  const validInput = {
    targetingStrategy: "hybrid" as const,
    userAdjustedCampaigns: GT_CAMPAIGNS,
  };

  it("returns validation_error when targetingStrategy is invalid", async () => {
    const result = await campaignBuilderAttempt({
      targetingStrategy: "invalid" as TargetingStrategy,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("validation_error");
  });

  it("returns attempt_error when no published scenario exists", async () => {
    happyContainer();
    mockContainer.scenarioRepo.findPublished.mockResolvedValueOnce(Result.ok(null));
    const result = await campaignBuilderAttempt(validInput);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("attempt_error");
  });

  it("happy path: starts attempt, grades, composes feedback, returns result", async () => {
    happyContainer();
    const result = await campaignBuilderAttempt(validInput);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(mockContainer.startSimulatorAttempt.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        simulatorId: "campaign-builder",
        mode: "practice",
        scenarioId: "campaign-builder-scenario-default",
      }),
    );
    expect(fakeSimulator.run).toHaveBeenCalledWith(
      expect.objectContaining({
        productCategory: "Electronics",
        productNiche: "wireless earbuds",
        monthlyBudget: 15000,
      }),
    );
    expect(mockContainer.gradeSimulatorAttempt.execute).toHaveBeenCalled();
    expect(mockContainer.composeAttemptFeedback.execute).toHaveBeenCalledWith({
      attemptId: "ATT-CB001",
    });

    expect(result.value.attemptId).toBe("ATT-CB001");
    expect(result.value.overallScore).toBe(80);
    expect(result.value.scoreDimensions).not.toBeNull();
    expect(result.value.isPassed).toBe(true);
    expect(result.value.feedback).not.toBeNull();
  });

  it("returns attempt_error when startSimulatorAttempt fails", async () => {
    happyContainer();
    mockContainer.startSimulatorAttempt.execute.mockResolvedValue(
      Result.err({ kind: "db_error", message: "connection failed" }),
    );
    const result = await campaignBuilderAttempt(validInput);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("attempt_error");
  });

  it("returns grading_error when gradeSimulatorAttempt fails", async () => {
    happyContainer();
    mockContainer.gradeSimulatorAttempt.execute.mockResolvedValue(
      Result.err({ kind: "policy_not_found" }),
    );
    const result = await campaignBuilderAttempt(validInput);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("grading_error");
  });

  it("saves a decision and submits before grading (GradeSimulatorAttempt requires 'submitted' status)", async () => {
    happyContainer();
    await campaignBuilderAttempt(validInput);

    expect(mockContainer.saveSimulatorDecision.execute).toHaveBeenCalledWith(
      expect.objectContaining({ attemptId: "ATT-CB001" }),
    );
    expect(mockContainer.submitSimulatorAttempt.execute.mock.invocationCallOrder[0]).toBeLessThan(
      mockContainer.gradeSimulatorAttempt.execute.mock.invocationCallOrder[0]!,
    );
  });

  it("returns attempt_error when submitSimulatorAttempt fails", async () => {
    happyContainer();
    mockContainer.submitSimulatorAttempt.execute.mockResolvedValue(
      Result.err({ kind: "no_decisions_made" }),
    );
    const result = await campaignBuilderAttempt(validInput);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("attempt_error");
    expect(mockContainer.gradeSimulatorAttempt.execute).not.toHaveBeenCalled();
  });

  it("preview mode (no userAdjustedCampaigns) skips grading and feedback, but still persists an attempt", async () => {
    happyContainer();
    const previewInput = { targetingStrategy: "hybrid" as const };
    const result = await campaignBuilderAttempt(previewInput);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(mockContainer.startSimulatorAttempt.execute).toHaveBeenCalled();
    expect(mockContainer.saveSimulatorDecision.execute).not.toHaveBeenCalled();
    expect(mockContainer.submitSimulatorAttempt.execute).not.toHaveBeenCalled();
    expect(mockContainer.gradeSimulatorAttempt.execute).not.toHaveBeenCalled();
    expect(mockContainer.composeAttemptFeedback.execute).not.toHaveBeenCalled();
    expect(result.value.scoreDimensions).toBeNull();
    expect(result.value.feedback).toBeNull();
    expect(result.value.isPassed).toBe(false);
  });

  it("includes campaigns in the response", async () => {
    happyContainer();
    const result = await campaignBuilderAttempt(validInput);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.campaigns).toHaveLength(3);
  });

  it("awards Challenge-mode XP on a passing challenge attempt", async () => {
    happyContainer();
    const result = await campaignBuilderAttempt({ ...validInput, mode: "challenge" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(mockContainer.awardXp.execute).toHaveBeenCalledWith({
      userId: "user_123",
      amount: 25,
      reason: "simulator_challenge_passed",
      refId: "ATT-CB001",
    });
    expect(result.value.xpAwarded).toBe(25);
  });

  it("does not award XP for a passing practice-mode attempt", async () => {
    happyContainer();
    const result = await campaignBuilderAttempt(validInput);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(mockContainer.awardXp.execute).not.toHaveBeenCalled();
    expect(result.value.xpAwarded).toBeNull();
  });
});

type TargetingStrategy =
  import("@/domain/simulator/campaign-builder/CampaignBuilderInput").TargetingStrategy;
type CampaignStructure =
  import("@/domain/simulator/campaign-builder/CampaignBuilderOutput").CampaignStructure;

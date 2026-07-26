/**
 * campaign-builder actions — server action contract tests.
 *
 * STORY-069: Campaign Builder Rebuild (Scoring Engine Integration).
 *
 * Tests both the new campaignBuilderAttempt() lifecycle function and the
 * legacy buildCampaign() backward-compatibility wrapper.
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
import type { CampaignBuilderOutput } from "@/domain/simulator/campaign-builder/CampaignBuilderOutput";
import { campaignBuilderAttempt, buildCampaign } from "../actions";

const mockContainer = {
  startSimulatorAttempt: { execute: vi.fn() },
  gradeSimulatorAttempt: { execute: vi.fn() },
  composeAttemptFeedback: { execute: vi.fn() },
  simulatorRegistry: { get: vi.fn() },
};

const fakeSimulator = {
  simulatorId: "campaign-builder" as const,
  name: "Campaign Builder",
  run: vi.fn(),
};

// ── Fixtures ──────────────────────────────────────────────────────────

const GRADED_ATTEMPT: SimulatorAttempt = {
  id: "sys-attempt-1",
  attemptId: "ATT-CB001",
  userId: "system",
  simulatorId: "campaign-builder",
  scenarioId: "campaign-builder-scenario-default",
  scenarioVersion: 1,
  difficulty: "beginner",
  mode: "practice",
  status: "graded",
  seed: "SEED8888",
  score: 80,
  scoreDimensions: {
    structureQuality: 80,
    budgetAllocation: 90,
    keywordRelevance: 70,
  },
  startedAt: new Date(),
  submittedAt: new Date(),
  gradedAt: new Date(),
  decisions: [],
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

const SIM_OUTPUT: CampaignBuilderOutput = {
  campaigns: GT_CAMPAIGNS,
  score: 80,
  scoreDimensions: {
    structureQuality: 80,
    budgetAllocation: 90,
    keywordRelevance: 70,
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
    Result.ok({ attemptId: "ATT-CB001", startedAt: new Date() }),
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
        userId: "system",
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
  (getContainer as ReturnType<typeof vi.fn>).mockReturnValue(mockContainer);
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
      productCategory: "Electronics",
      productNiche: "wireless earbuds",
      monthlyBudget: 3000,
      targetingStrategy: "hybrid",
      userAdjustedCampaigns: GT_CAMPAIGNS,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("unauthorized");
  });

  const validInput = {
    productCategory: "Electronics",
    productNiche: "wireless earbuds",
    monthlyBudget: 3000,
    targetingStrategy: "hybrid" as const,
    userAdjustedCampaigns: GT_CAMPAIGNS,
  };

  it("returns validation_error when productCategory is missing", async () => {
    const result = await campaignBuilderAttempt({
      productNiche: "earbuds",
      monthlyBudget: 1000,
      targetingStrategy: "auto",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("validation_error");
  });

  it("returns validation_error when monthlyBudget is not positive", async () => {
    const result = await campaignBuilderAttempt({
      productCategory: "Electronics",
      productNiche: "earbuds",
      monthlyBudget: 0,
      targetingStrategy: "auto",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("validation_error");
  });

  it("returns validation_error when targetingStrategy is invalid", async () => {
    const result = await campaignBuilderAttempt({
      productCategory: "Electronics",
      productNiche: "earbuds",
      monthlyBudget: 1000,
      targetingStrategy: "invalid" as TargetingStrategy,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("validation_error");
  });

  it("happy path: starts attempt, grades, composes feedback, returns result", async () => {
    happyContainer();
    const result = await campaignBuilderAttempt(validInput);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(mockContainer.startSimulatorAttempt.execute).toHaveBeenCalledWith(
      expect.objectContaining({ simulatorId: "campaign-builder", mode: "practice" }),
    );
    expect(fakeSimulator.run).toHaveBeenCalled();
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

  it("preview mode (no userAdjustedCampaigns) skips grading and feedback", async () => {
    happyContainer();
    const previewInput = {
      productCategory: "Electronics",
      productNiche: "wireless earbuds",
      monthlyBudget: 3000,
      targetingStrategy: "hybrid" as const,
    };
    const result = await campaignBuilderAttempt(previewInput);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

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
});

// ── buildCampaign (legacy) tests ──────────────────────────────────────

describe("buildCampaign (legacy)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupGetContainer();
    mockContainer.simulatorRegistry.get.mockReturnValue(fakeSimulator);
    fakeSimulator.run.mockResolvedValue({
      campaigns: GT_CAMPAIGNS,
      score: 90,
      scoreDimensions: null,
    });
  });

  it("returns invalid_input when productCategory is empty", async () => {
    const result = await buildCampaign({
      productCategory: "",
      productNiche: "earbuds",
      monthlyBudget: 1000,
      targetingStrategy: "auto",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("invalid_input");
  });

  it("returns invalid_input when monthlyBudget is 0", async () => {
    const result = await buildCampaign({
      productCategory: "Electronics",
      productNiche: "earbuds",
      monthlyBudget: 0,
      targetingStrategy: "auto",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("invalid_input");
  });

  it("returns invalid_input when targetingStrategy is invalid", async () => {
    const result = await buildCampaign({
      productCategory: "Electronics",
      productNiche: "earbuds",
      monthlyBudget: 1000,
      targetingStrategy: "invalid" as TargetingStrategy,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("invalid_input");
  });

  it("returns campaigns for valid input", async () => {
    const result = await buildCampaign({
      productCategory: "Electronics",
      productNiche: "wireless earbuds",
      monthlyBudget: 3000,
      targetingStrategy: "hybrid",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.campaigns).toHaveLength(3);
    expect(result.value.scoreDimensions).toBeNull();
  });
});

type TargetingStrategy =
  import("@/domain/simulator/campaign-builder/CampaignBuilderInput").TargetingStrategy;
type CampaignStructure =
  import("@/domain/simulator/campaign-builder/CampaignBuilderOutput").CampaignStructure;

/**
 * keyword-research actions — server action contract tests.
 *
 * STORY-081: Keyword Research is now its own registry entry with its own
 * lifecycle, distinct from Listing Audit.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Result } from "@/domain/shared/Result";
vi.mock("server-only", () => ({}));

vi.mock("@/composition/container", () => ({
  getContainer: vi.fn(),
  buildContainer: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSessionUserId: vi.fn(),
}));

import { getContainer, buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import type { KeywordDataset } from "@/domain/entities/KeywordDataset";
import type { KeywordResearchOutput } from "@/domain/simulator/keyword-research/KeywordResearchOutput";
import { previewKeywordResearch, keywordResearchAttempt } from "../actions";

const DATASET: KeywordDataset = {
  datasetId: "kwds-bamboo-cutting-board",
  version: "2026-07-29-v1",
  marketplace: "US",
  currencyCode: "USD",
  categoryId: "general_home",
  nicheId: "bamboo-cutting-board",
  sourceType: "synthetic_calibrated",
  generatedAt: "2026-07-29T00:00:00.000Z",
  keywords: [
    {
      term: "bamboo cutting board",
      normalizedTerm: "bamboo cutting board",
      monthlySearchVolume: 8500,
      competitionIndex: 0.74,
      suggestedBidLow: 0.6,
      suggestedBidMedian: 0.85,
      suggestedBidHigh: 1.2,
      relevanceScore: 1.0,
      intent: "core",
      brandClass: "generic",
      seasonalityIndex: 1.0,
      sourceConfidence: 0.8,
    },
    {
      term: "plastic cutting board",
      normalizedTerm: "plastic cutting board",
      monthlySearchVolume: 4200,
      competitionIndex: 0.6,
      suggestedBidLow: 0.35,
      suggestedBidMedian: 0.5,
      suggestedBidHigh: 0.7,
      relevanceScore: 0.1,
      intent: "irrelevant",
      brandClass: "generic",
      seasonalityIndex: 1.0,
      sourceConfidence: 0.8,
    },
  ],
};

const UNGRADED_OUTPUT: KeywordResearchOutput = {
  datasetId: DATASET.datasetId,
  datasetVersion: DATASET.version,
  sourceType: DATASET.sourceType,
  categoryId: DATASET.categoryId,
  nicheId: DATASET.nicheId,
  score: 100,
  scoreDimensions: null,
  keywords: DATASET.keywords.map((k) => ({
    term: k.term,
    normalizedTerm: k.normalizedTerm,
    monthlySearchVolume: k.monthlySearchVolume,
    competitionIndex: k.competitionIndex,
    suggestedBidLow: k.suggestedBidLow,
    suggestedBidMedian: k.suggestedBidMedian,
    suggestedBidHigh: k.suggestedBidHigh,
    relevanceScore: k.relevanceScore,
    seasonalityIndex: k.seasonalityIndex,
    groundTruthIntent: k.intent,
    groundTruthIsNegative: k.intent === "irrelevant",
  })),
};

const GRADED_OUTPUT: KeywordResearchOutput = {
  ...UNGRADED_OUTPUT,
  score: 100,
  scoreDimensions: { intentAccuracy: 100, negativeIdentification: 100 },
  keywords: UNGRADED_OUTPUT.keywords.map((k) => ({
    ...k,
    userIntent: k.groundTruthIntent,
    userIsNegative: k.groundTruthIsNegative,
    isIntentCorrect: true,
  })),
};

const VALID_CLASSIFICATIONS = {
  "bamboo cutting board": { intent: "core" as const, isNegative: false },
  "plastic cutting board": { intent: "irrelevant" as const, isNegative: true },
};

const mockContainer = {
  keywordDatasetRepo: { findByNiche: vi.fn() },
  simulatorRegistry: { get: vi.fn() },
  startSimulatorAttempt: { execute: vi.fn() },
  saveSimulatorDecision: { execute: vi.fn() },
  gradeSimulatorAttempt: { execute: vi.fn() },
  composeAttemptFeedback: { execute: vi.fn() },
  submitSimulatorAttempt: { execute: vi.fn() },
  scenarioRepo: { findPublished: vi.fn() },
  logger: { warn: vi.fn() },
  simulatorAttemptRepo: { findByUserAndSimulator: vi.fn() },
  scorePolicyRepo: { findBySimulatorAndDifficulty: vi.fn() },
  awardXp: { execute: vi.fn() },
};

const PUBLISHED_SCENARIO = {
  id: "keyword-research-scenario-default",
  scenarioKey: "keyword-research-scenario-default",
  version: 1,
  status: "published" as const,
  simulatorId: "keyword-research" as const,
  name: "Keyword research for bamboo cutting board niche",
  description: "Classify intent and flag negatives across 18 keywords in the niche.",
  inputSchema: { defaultNicheId: "bamboo-cutting-board" },
  outputSchema: {},
  difficulty: "beginner" as const,
  estimatedMinutes: 10,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const fakeSimulator = {
  simulatorId: "keyword-research" as const,
  name: "Keyword Research",
  run: vi.fn(),
};

function happyContainer() {
  mockContainer.keywordDatasetRepo.findByNiche.mockResolvedValue(Result.ok(DATASET));
  mockContainer.simulatorRegistry.get.mockReturnValue(fakeSimulator);
  fakeSimulator.run.mockImplementation(async (input: { userClassifications?: unknown }) =>
    input.userClassifications !== undefined ? GRADED_OUTPUT : UNGRADED_OUTPUT,
  );
  mockContainer.startSimulatorAttempt.execute.mockResolvedValue(
    Result.ok({ attemptId: "ATT-KW12345", startedAt: new Date() }),
  );
  mockContainer.saveSimulatorDecision.execute.mockResolvedValue(Result.ok({}));
  mockContainer.gradeSimulatorAttempt.execute.mockResolvedValue(
    Result.ok({
      attemptId: "ATT-KW12345",
      overallScore: 100,
      scoreDimensions: { intentAccuracy: 100, negativeIdentification: 100 },
      isPassed: true,
      gradedAt: new Date(),
    }),
  );
  mockContainer.composeAttemptFeedback.execute.mockResolvedValue(
    Result.ok({
      feedback: {
        attemptId: "ATT-KW12345",
        userId: "user_123",
        simulatorId: "keyword-research",
        scenarioId: "keyword-research-scenario-default",
        difficulty: "beginner",
        mode: "practice",
        overallScore: 100,
        passed: true,
        overallComment: "Strong keyword instincts.",
        remediationLinks: ["/courses", "/dashboard"],
        dimensionFeedback: [],
        completedAt: new Date(),
      },
    }),
  );
  mockContainer.submitSimulatorAttempt.execute.mockResolvedValue(
    Result.ok({ status: "submitted", submittedAt: new Date() }),
  );
  mockContainer.scenarioRepo.findPublished.mockResolvedValue(Result.ok(PUBLISHED_SCENARIO));
  mockContainer.simulatorAttemptRepo.findByUserAndSimulator.mockResolvedValue(Result.ok([]));
  mockContainer.awardXp.execute.mockResolvedValue(
    Result.ok({ xpEvent: { id: "xpe_1" }, totalXp: 100 }),
  );
}

describe("previewKeywordResearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (buildContainer as ReturnType<typeof vi.fn>).mockReturnValue(mockContainer);
    happyContainer();
  });

  it("returns invalid_input for a blank niche", async () => {
    const result = await previewKeywordResearch({ niche: "  " });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("invalid_input");
  });

  it("returns engine_error when the simulator is not registered", async () => {
    mockContainer.simulatorRegistry.get.mockReturnValue(null);
    const result = await previewKeywordResearch({ niche: "bamboo-cutting-board" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("engine_error");
  });

  it("returns keyword rows without ground-truth intent labels", async () => {
    const result = await previewKeywordResearch({ niche: "bamboo-cutting-board" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.datasetId).toBe("kwds-bamboo-cutting-board");
    expect(result.value.keywords).toHaveLength(2);
    for (const k of result.value.keywords) {
      expect(k).not.toHaveProperty("groundTruthIntent");
      expect(k).not.toHaveProperty("groundTruthIsNegative");
    }
    expect(result.value.keywords[0]!.term).toBe("bamboo cutting board");
    expect(result.value.keywords[0]!.monthlySearchVolume).toBe(8500);
  });
});

describe("keywordResearchAttempt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getContainer as ReturnType<typeof vi.fn>).mockReturnValue(mockContainer);
    (getSessionUserId as ReturnType<typeof vi.fn>).mockResolvedValue("user_123");
    happyContainer();
  });

  it("returns unauthorized when the user is not authenticated", async () => {
    (getSessionUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const result = await keywordResearchAttempt({
      niche: "bamboo-cutting-board",
      classifications: VALID_CLASSIFICATIONS,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("unauthorized");
  });

  it("returns validation_error for an invalid intent value", async () => {
    const result = await keywordResearchAttempt({
      niche: "bamboo-cutting-board",
      classifications: {
        "bamboo cutting board": { intent: "not-a-real-intent", isNegative: false },
      },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("validation_error");
  });

  it("returns validation_error for a blank niche", async () => {
    const result = await keywordResearchAttempt({
      niche: "",
      classifications: VALID_CLASSIFICATIONS,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("validation_error");
  });

  it("rejects a credential-mode attempt against a synthetic dataset", async () => {
    const result = await keywordResearchAttempt({
      niche: "bamboo-cutting-board",
      classifications: VALID_CLASSIFICATIONS,
      mode: "credential",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("credential_requires_curated_dataset");
  });

  it("returns attempt_error when no published scenario exists", async () => {
    mockContainer.scenarioRepo.findPublished.mockResolvedValueOnce(Result.ok(null));
    const result = await keywordResearchAttempt({
      niche: "bamboo-cutting-board",
      classifications: VALID_CLASSIFICATIONS,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("attempt_error");
  });

  it("happy path: runs the full lifecycle and returns the grade", async () => {
    const result = await keywordResearchAttempt({
      niche: "bamboo-cutting-board",
      classifications: VALID_CLASSIFICATIONS,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.attemptId).toBe("ATT-KW12345");
    expect(result.value.overallScore).toBe(100);
    expect(result.value.isPassed).toBe(true);
    expect(result.value.keywords).toHaveLength(2);
    expect(result.value.feedback.overallComment).toBe("Strong keyword instincts.");

    expect(mockContainer.startSimulatorAttempt.execute).toHaveBeenCalledWith(
      expect.objectContaining({ simulatorId: "keyword-research", mode: "practice" }),
    );
    expect(mockContainer.saveSimulatorDecision.execute).toHaveBeenCalledWith({
      attemptId: "ATT-KW12345",
      decisionData: expect.objectContaining({
        type: "keyword-research-classification",
        keywordDatasetId: "kwds-bamboo-cutting-board",
        keywordDatasetVersion: "2026-07-29-v1",
        classifications: VALID_CLASSIFICATIONS,
      }),
    });
    expect(mockContainer.gradeSimulatorAttempt.execute).toHaveBeenCalledWith({
      attemptId: "ATT-KW12345",
      scoreDimensions: { intentAccuracy: 100, negativeIdentification: 100 },
    });
  });

  it("submits before grading (GradeSimulatorAttempt requires 'submitted' status)", async () => {
    await keywordResearchAttempt({
      niche: "bamboo-cutting-board",
      classifications: VALID_CLASSIFICATIONS,
    });

    expect(mockContainer.submitSimulatorAttempt.execute.mock.invocationCallOrder[0]).toBeLessThan(
      mockContainer.gradeSimulatorAttempt.execute.mock.invocationCallOrder[0]!,
    );
  });

  it("returns attempt_error when submitSimulatorAttempt fails", async () => {
    mockContainer.submitSimulatorAttempt.execute.mockResolvedValueOnce(
      Result.err({ kind: "already_submitted" }),
    );
    const result = await keywordResearchAttempt({
      niche: "bamboo-cutting-board",
      classifications: VALID_CLASSIFICATIONS,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("attempt_error");
    expect(mockContainer.gradeSimulatorAttempt.execute).not.toHaveBeenCalled();
  });

  it("logs (not console.warn) and continues when saveSimulatorDecision fails", async () => {
    mockContainer.saveSimulatorDecision.execute.mockResolvedValueOnce(
      Result.err({ kind: "attempt_not_in_progress" }),
    );
    const result = await keywordResearchAttempt({
      niche: "bamboo-cutting-board",
      classifications: VALID_CLASSIFICATIONS,
    });
    expect(result.ok).toBe(true);
    expect(mockContainer.logger.warn).toHaveBeenCalledWith(
      "Failed to save keyword-research decision",
      expect.objectContaining({ attemptId: "ATT-KW12345" }),
    );
  });

  it("returns attempt_error when startSimulatorAttempt fails", async () => {
    mockContainer.startSimulatorAttempt.execute.mockResolvedValueOnce(
      Result.err({ kind: "scenario_not_found" }),
    );
    const result = await keywordResearchAttempt({
      niche: "bamboo-cutting-board",
      classifications: VALID_CLASSIFICATIONS,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("attempt_error");
  });

  it("returns grading_error when gradeSimulatorAttempt fails", async () => {
    mockContainer.gradeSimulatorAttempt.execute.mockResolvedValueOnce(
      Result.err({ kind: "policy_not_found" }),
    );
    const result = await keywordResearchAttempt({
      niche: "bamboo-cutting-board",
      classifications: VALID_CLASSIFICATIONS,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("grading_error");
  });

  it("returns feedback_error when composeAttemptFeedback fails", async () => {
    mockContainer.composeAttemptFeedback.execute.mockResolvedValueOnce(
      Result.err({ kind: "attempt_not_found" }),
    );
    const result = await keywordResearchAttempt({
      niche: "bamboo-cutting-board",
      classifications: VALID_CLASSIFICATIONS,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("feedback_error");
  });

  it("awards Challenge-mode XP on a passing challenge attempt", async () => {
    const result = await keywordResearchAttempt({
      niche: "bamboo-cutting-board",
      classifications: VALID_CLASSIFICATIONS,
      mode: "challenge",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(mockContainer.awardXp.execute).toHaveBeenCalledWith({
      userId: "user_123",
      amount: 25,
      reason: "simulator_challenge_passed",
      refId: "ATT-KW12345",
      idempotencyKey: "simulator_challenge_passed:user_123:ATT-KW12345",
    });
    expect(result.value.xpAwarded).toBe(25);
  });

  it("does not award XP for a passing practice-mode attempt", async () => {
    const result = await keywordResearchAttempt({
      niche: "bamboo-cutting-board",
      classifications: VALID_CLASSIFICATIONS,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(mockContainer.awardXp.execute).not.toHaveBeenCalled();
    expect(result.value.xpAwarded).toBeNull();
  });
});

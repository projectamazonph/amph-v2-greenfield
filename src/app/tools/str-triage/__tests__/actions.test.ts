/**
 * str-triage actions — server action contract tests.
 *
 * STORY-082: Expand STR Triage classifier. Rewritten for the new
 * SearchTermRow schema, 7-value TriageAction taxonomy, and the removal of
 * the legacy classifyStr() path.
 *
 * STORY-085: strTriageAttempt() no longer accepts scenario economics from
 * the client — it resolves the currently published str-triage scenario
 * server-side via scenarioRepo.findPublished(). Tests mock that lookup
 * instead of passing scenario fields in the input.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Result } from "@/domain/shared/Result";
vi.mock("server-only", () => ({}));

vi.mock("@/composition/container", () => ({
  buildContainer: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSessionUserId: vi.fn(),
}));

import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import type { StrTriageOutput } from "@/domain/simulator/str-triage/StrTriageOutput";
import { strTriageAttempt } from "../actions";

const mockContainer = {
  startSimulatorAttempt: { execute: vi.fn() },
  saveSimulatorDecision: { execute: vi.fn() },
  gradeSimulatorAttempt: { execute: vi.fn() },
  composeAttemptFeedback: { execute: vi.fn() },
  submitSimulatorAttempt: { execute: vi.fn() },
  simulatorRegistry: { get: vi.fn() },
  scenarioRepo: { findPublished: vi.fn() },
  simulatorAttemptRepo: { findByUserAndSimulator: vi.fn() },
  scorePolicyRepo: { findBySimulatorAndDifficulty: vi.fn() },
  awardXp: { execute: vi.fn() },
};

const fakeSimulator = {
  simulatorId: "str-triage" as const,
  name: "STR Triage",
  run: vi.fn(),
};

const VALID_ROW = {
  searchTerm: "stainless steel knife set",
  impressions: 6000,
  clicks: 300,
  spend: 120,
  orders: 8,
  sales: 480,
  elapsedDays: 14,
  sourceCampaignId: "camp-research-1",
  sourceAdGroupId: "ag-1",
  sourceTarget: "kitchen knives",
  sourceMatchType: "broad" as const,
};

const SCENARIO_CONTENT = {
  rows: [VALID_ROW],
  averageOrderValue: 30,
  expectedCtrPct: 4,
  expectedCvrPct: 5,
  brandTargetRoas: 5,
  genericTargetRoas: 3,
  competitorTargetRoas: 4,
  confidenceLevel: 0.8,
  minElapsedDays: 7,
  minOrdersForWinner: 2,
  brandLexicon: ["homechef"],
  competitorBrandLexicon: ["cutco"],
  existingTargets: [],
  sourceCampaignRole: "research" as const,
};

const PUBLISHED_SCENARIO = {
  id: "str-triage-scenario-kitchen-products",
  scenarioKey: "str-triage-scenario-kitchen-products",
  version: 1,
  status: "published" as const,
  simulatorId: "str-triage" as const,
  name: "Clean up a broad match campaign for kitchen products",
  description: "Triage 14 search terms from a broad-match kitchen products campaign.",
  inputSchema: SCENARIO_CONTENT,
  outputSchema: {},
  difficulty: "intermediate" as const,
  estimatedMinutes: 15,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const VALID_INPUT = {
  userActions: { "stainless steel knife set": "harvest_exact" as const },
  mode: "practice" as const,
};

const SIM_OUTPUT: StrTriageOutput = {
  classifications: [
    {
      searchTerm: "stainless steel knife set",
      groundTruth: "harvest_exact",
      userChoice: "harvest_exact",
      isCorrect: true,
      roas: 4.0,
      spend: 120,
      brandClass: "generic",
      reasoning: "Winning term with no existing exact target.",
      routingNote: null,
    },
  ],
  scoreDimensions: { direction: 100, profitability: 100, reviewCoverage: 100 },
  score: 100,
};

function happyContainer() {
  mockContainer.startSimulatorAttempt.execute.mockResolvedValue(
    Result.ok({ attemptId: "ATT-STR1234", startedAt: new Date() }),
  );
  mockContainer.saveSimulatorDecision.execute.mockResolvedValue(Result.ok({}));
  mockContainer.gradeSimulatorAttempt.execute.mockResolvedValue(
    Result.ok({
      attemptId: "ATT-STR1234",
      overallScore: 100,
      scoreDimensions: { direction: 100, profitability: 100 },
      isPassed: true,
      gradedAt: new Date(),
    }),
  );
  mockContainer.composeAttemptFeedback.execute.mockResolvedValue(
    Result.ok({
      feedback: {
        attemptId: "ATT-STR1234",
        userId: "user_123",
        simulatorId: "str-triage",
        scenarioId: "str-triage-scenario-kitchen-products",
        difficulty: "beginner",
        mode: "practice",
        overallScore: 100,
        passed: true,
        overallComment: "Excellent prioritization.",
        remediationLinks: ["/courses", "/dashboard"],
        dimensionFeedback: [],
        completedAt: new Date(),
      },
    }),
  );
  mockContainer.submitSimulatorAttempt.execute.mockResolvedValue(
    Result.ok({ status: "submitted", submittedAt: new Date() }),
  );
  mockContainer.simulatorRegistry.get.mockReturnValue(fakeSimulator);
  fakeSimulator.run.mockResolvedValue(SIM_OUTPUT);
  mockContainer.scenarioRepo.findPublished.mockResolvedValue(Result.ok(PUBLISHED_SCENARIO));
  mockContainer.simulatorAttemptRepo.findByUserAndSimulator.mockResolvedValue(Result.ok([]));
  mockContainer.awardXp.execute.mockResolvedValue(
    Result.ok({ xpEvent: { id: "xpe_1" }, totalXp: 100 }),
  );
}

describe("strTriageAttempt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (buildContainer as ReturnType<typeof vi.fn>).mockReturnValue(mockContainer);
    (getSessionUserId as ReturnType<typeof vi.fn>).mockResolvedValue("user_123");
    happyContainer();
  });

  it("returns unauthorized when user is not authenticated", async () => {
    (getSessionUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const result = await strTriageAttempt(VALID_INPUT);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("unauthorized");
  });

  it("returns validation_error for an unknown triage action", async () => {
    const result = await strTriageAttempt({
      userActions: { "stainless steel knife set": "shrug" },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("validation_error");
  });

  it("returns attempt_error when no published scenario exists", async () => {
    mockContainer.scenarioRepo.findPublished.mockResolvedValueOnce(Result.ok(null));
    const result = await strTriageAttempt(VALID_INPUT);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("attempt_error");
  });

  it("returns attempt_error when the published scenario's content is malformed", async () => {
    mockContainer.scenarioRepo.findPublished.mockResolvedValueOnce(
      Result.ok({ ...PUBLISHED_SCENARIO, inputSchema: { rows: [] } }),
    );
    const result = await strTriageAttempt(VALID_INPUT);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("attempt_error");
  });

  it("happy path: starts attempt, grades, composes feedback, returns result", async () => {
    const result = await strTriageAttempt(VALID_INPUT);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.attemptId).toBe("ATT-STR1234");
    expect(result.value.overallScore).toBe(100);
    expect(result.value.isPassed).toBe(true);
    expect(result.value.feedback.overallComment).toBe("Excellent prioritization.");
    expect(result.value.classifications).toHaveLength(1);
    expect(result.value.classifications[0]!.searchTerm).toBe("stainless steel knife set");

    expect(mockContainer.startSimulatorAttempt.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        simulatorId: "str-triage",
        mode: "practice",
        scenarioId: "str-triage-scenario-kitchen-products",
      }),
    );
    expect(mockContainer.gradeSimulatorAttempt.execute).toHaveBeenCalledWith({
      attemptId: "ATT-STR1234",
      scoreDimensions: { direction: 100, profitability: 100 },
    });
    expect(mockContainer.composeAttemptFeedback.execute).toHaveBeenCalledWith({
      attemptId: "ATT-STR1234",
    });
    expect(mockContainer.submitSimulatorAttempt.execute).toHaveBeenCalled();
  });

  it("passes the server-resolved scenario config through to the simulator, not client input", async () => {
    await strTriageAttempt(VALID_INPUT);
    expect(fakeSimulator.run).toHaveBeenCalledWith(
      expect.objectContaining({
        averageOrderValue: 30,
        brandTargetRoas: 5,
        genericTargetRoas: 3,
        competitorTargetRoas: 4,
        sourceCampaignRole: "research",
        userClassifications: VALID_INPUT.userActions,
      }),
    );
  });

  it("returns attempt_error when startSimulatorAttempt fails", async () => {
    mockContainer.startSimulatorAttempt.execute.mockResolvedValueOnce(
      Result.err({ kind: "scenario_not_found" }),
    );
    const result = await strTriageAttempt(VALID_INPUT);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("attempt_error");
  });

  it("returns grading_error when gradeSimulatorAttempt fails", async () => {
    mockContainer.gradeSimulatorAttempt.execute.mockResolvedValueOnce(
      Result.err({ kind: "policy_not_found" }),
    );
    const result = await strTriageAttempt(VALID_INPUT);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("grading_error");
  });

  it("returns feedback_error when composeAttemptFeedback fails", async () => {
    mockContainer.composeAttemptFeedback.execute.mockResolvedValueOnce(
      Result.err({ kind: "attempt_not_found" }),
    );
    const result = await strTriageAttempt(VALID_INPUT);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("feedback_error");
  });

  it("awards Challenge-mode XP on a passing challenge attempt", async () => {
    const result = await strTriageAttempt({ ...VALID_INPUT, mode: "challenge" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(mockContainer.awardXp.execute).toHaveBeenCalledWith({
      userId: "user_123",
      amount: 25,
      reason: "simulator_challenge_passed",
      refId: "ATT-STR1234",
    });
    expect(result.value.xpAwarded).toBe(25);
  });

  it("does not award XP for a passing practice-mode attempt", async () => {
    const result = await strTriageAttempt(VALID_INPUT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(mockContainer.awardXp.execute).not.toHaveBeenCalled();
    expect(result.value.xpAwarded).toBeNull();
  });
});

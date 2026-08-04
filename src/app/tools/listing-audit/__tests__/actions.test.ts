/**
 * listing-audit actions — server action contract tests.
 *
 * STORY-070: Listing Audit Rebuild (Scoring Engine Integration).
 *
 * Tests both the new listingAuditAttempt() lifecycle function and the
 * legacy auditListing() backward-compatibility wrapper.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Result } from "@/domain/shared/Result";
vi.mock("server-only", () => ({}));

// ── Module mocking ─────────────────────────────────────────────────────
// We mock the composition container so we can inject fake dependencies
// without needing a real DATABASE_URL.

vi.mock("@/composition/container", () => ({
  getContainer: vi.fn(),
  buildContainer: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSessionUserId: vi.fn(),
}));

import { getContainer, buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import type { ListingAuditOutput } from "@/domain/simulator/listing-audit/ListingAuditOutput";
import { listingAuditAttempt, auditListing } from "../actions";

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
  scenarioRepo: {
    findPublished: vi.fn(),
  },
};

const PUBLISHED_SCENARIO = {
  id: "listing-audit-scenario-bamboo-cutting-board",
  scenarioKey: "listing-audit-scenario-bamboo-cutting-board",
  version: 1,
  status: "published" as const,
  simulatorId: "listing-audit" as const,
  name: "Bamboo Cutting Board — Premium Kitchen Essential",
  description: "Audit and revise a bamboo cutting board listing.",
  inputSchema: {
    category: "Kitchen",
    niche: "bamboo cutting board",
    bullets: [],
    description: "",
    images: [],
    hasVideo: false,
    hasAPlus: false,
    marketplace: "US",
  },
  outputSchema: {},
  difficulty: "beginner" as const,
  estimatedMinutes: 10,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const fakeSimulator = {
  simulatorId: "listing-audit" as const,
  name: "Listing Audit + Keyword Research",
  run: vi.fn(),
};

// ── Fixtures ────────────────────────────────────────────────────────────

const SIM_OUTPUT: ListingAuditOutput = {
  audit: {
    dimensionScores: {
      compliance: 80,
      relevance: 70,
      accuracy: 60,
      conversion: 60,
      mobile: 60,
      imagery: 40,
    },
    overallScore: 63,
    findings: [
      {
        id: "finding-0",
        ruleId: "niche_in_title",
        dimension: "relevance",
        severity: "warning",
        isCriticalGate: false,
        message: "Title is shorter than recommended.",
        suggestion: "Expand the title.",
        category: "general_home",
        marketplace: "US",
        policyVersion: "amazon-2026-07-27",
        effectiveDate: "2026-07-27",
      },
      {
        id: "finding-1",
        ruleId: "backend_keyword_room",
        dimension: "relevance",
        severity: "info",
        isCriticalGate: false,
        message: "Not enough room for all keywords.",
        suggestion: "Add backend keywords.",
        category: "general_home",
        marketplace: "US",
        policyVersion: "amazon-2026-07-27",
        effectiveDate: "2026-07-27",
      },
    ],
  },
  keywordResearch: { keywords: [], searchVolumeEstimate: 0 },
  score: 63,
  gradedFindings: [
    {
      id: "finding-0",
      ruleId: "niche_in_title",
      dimension: "relevance",
      severity: "warning",
      isCriticalGate: false,
      message: "Title is shorter than recommended.",
      suggestion: "Expand the title.",
      category: "general_home",
      marketplace: "US",
      policyVersion: "amazon-2026-07-27",
      effectiveDate: "2026-07-27",
      groundTruth: "fix",
      userChoice: "fix",
      isCorrect: true,
    },
    {
      id: "finding-1",
      ruleId: "backend_keyword_room",
      dimension: "relevance",
      severity: "info",
      isCriticalGate: false,
      message: "Not enough room for all keywords.",
      suggestion: "Add backend keywords.",
      category: "general_home",
      marketplace: "US",
      policyVersion: "amazon-2026-07-27",
      effectiveDate: "2026-07-27",
      groundTruth: "skip",
      userChoice: "skip",
      isCorrect: true,
    },
  ],
  scoreDimensions: {
    direction: 100,
    priorityCoverage: 100,
    reviewCoverage: 100,
  },
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
    Result.ok({ attemptId: "ATT-XYZ789", startedAt: new Date() }),
  );
  c.saveSimulatorDecision.execute.mockResolvedValue(Result.ok({}));
  c.gradeSimulatorAttempt.execute.mockResolvedValue(
    Result.ok({
      attemptId: "ATT-XYZ789",
      overallScore: 100,
      scoreDimensions: {
        direction: 100,
        priorityCoverage: 100,
        reviewCoverage: 100,
      },
      isPassed: true,
      gradedAt: new Date(),
    }),
  );
  c.composeAttemptFeedback.execute.mockResolvedValue(
    Result.ok({
      feedback: {
        attemptId: "ATT-XYZ789",
        userId: "user_123",
        simulatorId: "listing-audit",
        scenarioId: "listing-audit-scenario-bamboo-cutting-board",
        difficulty: "beginner",
        mode: "practice",
        overallScore: 100,
        passed: true,
        overallComment: "Great triage.",
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
  c.scenarioRepo.findPublished.mockResolvedValue(Result.ok(PUBLISHED_SCENARIO));
}

const VALID_INPUT = {
  title: "Bamboo Cutting Board",
  bullets: ["100% organic bamboo"],
  description: "High-quality bamboo cutting board.",
  userFindingActions: { "finding-0": "fix", "finding-1": "skip" },
};

// ── listingAuditAttempt tests ────────────────────────────────────────────

describe("listingAuditAttempt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getContainer as ReturnType<typeof vi.fn>).mockReturnValue(mockContainer);
    (getSessionUserId as ReturnType<typeof vi.fn>).mockResolvedValue("user_123");
    happyContainer();
  });

  it("returns unauthorized when user is not authenticated", async () => {
    (getSessionUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const result = await listingAuditAttempt(VALID_INPUT);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("unauthorized");
  });

  it("returns validation_error when title is missing", async () => {
    const result = await listingAuditAttempt({ ...VALID_INPUT, title: "" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("validation_error");
  });

  it("returns validation_error when bullets is not an array", async () => {
    const result = await listingAuditAttempt({ ...VALID_INPUT, bullets: "not an array" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("validation_error");
  });

  it("returns attempt_error when no published scenario exists", async () => {
    (mockContainer.scenarioRepo.findPublished as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      Result.ok(null),
    );
    const result = await listingAuditAttempt(VALID_INPUT);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("attempt_error");
  });

  it("returns validation_error for an unknown finding action", async () => {
    const result = await listingAuditAttempt({
      ...VALID_INPUT,
      userFindingActions: { "finding-0": "shrug" },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("validation_error");
  });

  it("happy path: starts attempt, grades, composes feedback, returns result", async () => {
    const result = await listingAuditAttempt(VALID_INPUT);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.attemptId).toBe("ATT-XYZ789");
    expect(result.value.overallScore).toBe(100);
    expect(result.value.isPassed).toBe(true);
    expect(result.value.feedback.passed).toBe(true);
    expect(result.value.feedback.overallComment).toBe("Great triage.");

    expect(mockContainer.startSimulatorAttempt.execute).toHaveBeenCalled();
    expect(mockContainer.gradeSimulatorAttempt.execute).toHaveBeenCalled();
    expect(mockContainer.composeAttemptFeedback.execute).toHaveBeenCalledWith({
      attemptId: "ATT-XYZ789",
    });
    expect(mockContainer.submitSimulatorAttempt.execute).toHaveBeenCalled();
  });

  it("submits before grading (GradeSimulatorAttempt requires 'submitted' status)", async () => {
    await listingAuditAttempt(VALID_INPUT);

    expect(
      (mockContainer.submitSimulatorAttempt.execute as ReturnType<typeof vi.fn>).mock
        .invocationCallOrder[0],
    ).toBeLessThan(
      (mockContainer.gradeSimulatorAttempt.execute as ReturnType<typeof vi.fn>).mock
        .invocationCallOrder[0]!,
    );
  });

  it("returns attempt_error when submitSimulatorAttempt fails", async () => {
    (
      mockContainer.submitSimulatorAttempt.execute as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce(Result.err({ kind: "no_decisions_made" }));
    const result = await listingAuditAttempt(VALID_INPUT);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("attempt_error");
    expect(mockContainer.gradeSimulatorAttempt.execute).not.toHaveBeenCalled();
  });

  it("returns attempt_error when startSimulatorAttempt fails", async () => {
    (mockContainer.startSimulatorAttempt.execute as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      Result.err({ kind: "attempt_not_found" }),
    );

    const result = await listingAuditAttempt(VALID_INPUT);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("attempt_error");
  });

  it("returns grading_error when gradeSimulatorAttempt fails", async () => {
    (mockContainer.gradeSimulatorAttempt.execute as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      Result.err({ kind: "policy_not_found" }),
    );

    const result = await listingAuditAttempt(VALID_INPUT);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("grading_error");
  });

  it("returns feedback_error when composeAttemptFeedback fails", async () => {
    (
      mockContainer.composeAttemptFeedback.execute as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce(Result.err({ kind: "attempt_not_found" }));

    const result = await listingAuditAttempt(VALID_INPUT);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("feedback_error");
  });

  it("includes per-finding graded results in the response", async () => {
    const result = await listingAuditAttempt(VALID_INPUT);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.gradedFindings).toHaveLength(2);
    expect(result.value.gradedFindings[0]!.id).toBe("finding-0");
    expect(result.value.gradedFindings[0]!.groundTruth).toBe("fix");
    expect(result.value.gradedFindings[0]!.isCorrect).toBe(true);
  });
});

// ── auditListing legacy tests ────────────────────────────────────────────

describe("auditListing (legacy)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (buildContainer as ReturnType<typeof vi.fn>).mockReturnValue(mockContainer);
    happyContainer();
  });

  it("returns invalid_input when title is empty", async () => {
    const result = await auditListing({
      title: "",
      bullets: [],
      description: "",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("invalid_input");
  });

  it("returns a 0-100 score for valid input", async () => {
    const result = await auditListing({
      title: "Bamboo Cutting Board",
      bullets: ["100% organic bamboo"],
      description: "High-quality bamboo cutting board.",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.score).toBeGreaterThanOrEqual(0);
    expect(result.value.score).toBeLessThanOrEqual(100);
  });

  it("returns engine_error when no published scenario exists", async () => {
    (mockContainer.scenarioRepo.findPublished as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      Result.ok(null),
    );
    const result = await auditListing({
      title: "Bamboo Cutting Board",
      bullets: ["100% organic bamboo"],
      description: "High-quality bamboo cutting board.",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("engine_error");
  });
});

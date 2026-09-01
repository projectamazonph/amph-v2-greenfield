/**
 * Unit tests for ResolveFindingAction use case.
 * STORY-083: Listing Audit: non-binary, context-aware ground truth.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Result } from "@/domain/shared/Result";
import { InMemoryListingAuditRuleRepository } from "@/infra/repositories/InMemoryListingAuditRuleRepository";
import { ResolveFindingAction } from "@/usecases/ListingAuditRule/ResolveFindingAction";
import { createListingAuditRule } from "@/domain/entities/ListingAuditRule";
import { InMemoryIdGenerator } from "@/infra/system/InMemoryIdGenerator";
import { SystemClock } from "@/ports/system/Clock";

describe("ResolveFindingAction", () => {
  let repo: InMemoryListingAuditRuleRepository;
  let useCase: ResolveFindingAction;

  beforeEach(() => {
    repo = new InMemoryListingAuditRuleRepository();
    useCase = new ResolveFindingAction(repo);
  });

  it("should return default action when no rules match", async () => {
    const result = await useCase.execute({
      ruleId: "test_rule",
      dimension: "compliance",
      severity: "critical",
      context: {
        category: "general_home",
        imagesCount: 5,
        hasAPlus: false,
        hasVideo: false,
        attributes: {},
      },
    });

    expect(result.ok).toBe(true);
    expect(result.value.expectedAction).toBe("fixNow");
    expect(result.value.acceptedActions).toEqual(["fixNow"]);
  });

  it("should return rule action when rule matches", async () => {
    const idGen = new InMemoryIdGenerator();
    const clock = new SystemClock();

    const rule = createListingAuditRule({
      id: idGen.newId(),
      ruleId: "test_rule",
      dimension: "compliance",
      severity: "critical",
      applicableCategories: ["general_home"],
      conditions: [],
      action: {
        action: "defer",
        acceptedActions: ["defer", "fixNow"],
        rationale: "Test rationale",
      },
      priority: 0,
      isActive: true,
      createdBy: "admin",
      createdAt: clock.now(),
      updatedAt: clock.now(),
    });

    await repo.create(rule.value);

    const result = await useCase.execute({
      ruleId: "test_rule",
      dimension: "compliance",
      severity: "critical",
      context: {
        category: "general_home",
        imagesCount: 5,
        hasAPlus: false,
        hasVideo: false,
        attributes: {},
      },
    });

    expect(result.ok).toBe(true);
    expect(result.value.expectedAction).toBe("defer");
    expect(result.value.acceptedActions).toEqual(["defer", "fixNow"]);
    expect(result.value.rationale).toBe("Test rationale");
  });

  it("should return severity-based default when no rule matches", async () => {
    const result = await useCase.execute({
      ruleId: "test_rule",
      dimension: "compliance",
      severity: "info",
      context: {
        category: "general_home",
        imagesCount: 5,
        hasAPlus: false,
        hasVideo: false,
        attributes: {},
      },
    });

    expect(result.ok).toBe(true);
    expect(result.value.expectedAction).toBe("skip");
  });
});

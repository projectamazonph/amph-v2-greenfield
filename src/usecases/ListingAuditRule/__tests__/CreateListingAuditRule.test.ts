/**
 * Unit tests for CreateListingAuditRule use case.
 * STORY-083: Listing Audit: non-binary, context-aware ground truth.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Result } from "@/domain/shared/Result";
import { InMemoryListingAuditRuleRepository } from "@/infra/repositories/InMemoryListingAuditRuleRepository";
import { CreateListingAuditRule } from "@/usecases/ListingAuditRule/CreateListingAuditRule";
import { InMemoryIdGenerator } from "@/infra/system/InMemoryIdGenerator";
import { SystemClock } from "@/infra/system/SystemClock";

describe("CreateListingAuditRule", () => {
  let repo: InMemoryListingAuditRuleRepository;
  let idGen: InMemoryIdGenerator;
  let clock: SystemClock;
  let useCase: CreateListingAuditRule;

  beforeEach(() => {
    repo = new InMemoryListingAuditRuleRepository();
    idGen = new InMemoryIdGenerator();
    clock = new SystemClock();
    useCase = new CreateListingAuditRule(repo, idGen, clock);
  });

  it("should create a valid rule", async () => {
    const result = await useCase.execute({
      ruleId: "test_rule",
      dimension: "compliance",
      severity: "critical",
      applicableCategories: ["general_home"],
      conditions: [],
      action: {
        action: "fixNow",
        acceptedActions: ["fixNow"],
        rationale: "Test rationale",
      },
      priority: 0,
      isActive: true,
      createdBy: "admin",
    });

    expect(result.ok).toBe(true);
    expect(result.value.ruleId).toBe("test_rule");
    expect(result.value.dimension).toBe("compliance");
    expect(result.value.severity).toBe("critical");
    expect(result.value.isActive).toBe(true);
  });

  it("should fail for invalid rule data", async () => {
    const result = await useCase.execute({
      ruleId: "",
      dimension: "compliance",
      severity: "critical",
      applicableCategories: [],
      conditions: [],
      action: {
        action: "fixNow",
        acceptedActions: ["fixNow"],
        rationale: "Test",
      },
      priority: 0,
      isActive: true,
      createdBy: "admin",
    });

    expect(result.ok).toBe(false);
  });
});

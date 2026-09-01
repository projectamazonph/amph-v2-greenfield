/**
 * Unit tests for ListListingAuditRules use case.
 * STORY-083: Listing Audit: non-binary, context-aware ground truth.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Result } from "@/domain/shared/Result";
import { InMemoryListingAuditRuleRepository } from "@/infra/repositories/InMemoryListingAuditRuleRepository";
import { ListListingAuditRules } from "@/usecases/ListingAuditRule/ListListingAuditRules";
import { createListingAuditRule } from "@/domain/entities/ListingAuditRule";
import { InMemoryIdGenerator } from "@/infra/system/InMemoryIdGenerator";
import { SystemClock } from "@/ports/system/Clock";

describe("ListListingAuditRules", () => {
  let repo: InMemoryListingAuditRuleRepository;
  let useCase: ListListingAuditRules;

  beforeEach(() => {
    repo = new InMemoryListingAuditRuleRepository();
    useCase = new ListListingAuditRules(repo);
  });

  it("should return empty list when no rules exist", async () => {
    const result = await useCase.execute();
    expect(result.ok).toBe(true);
    expect(result.value).toHaveLength(0);
  });

  it("should return all rules", async () => {
    const idGen = new InMemoryIdGenerator();
    const clock = new SystemClock();

    const rule1 = createListingAuditRule({
      id: idGen.newId(),
      ruleId: "rule1",
      dimension: "compliance",
      severity: "critical",
      applicableCategories: [],
      conditions: [],
      action: { action: "fixNow", acceptedActions: ["fixNow"], rationale: "Test" },
      priority: 0,
      isActive: true,
      createdBy: "admin",
      createdAt: clock.now(),
      updatedAt: clock.now(),
    });

    const rule2 = createListingAuditRule({
      id: idGen.newId(),
      ruleId: "rule2",
      dimension: "relevance",
      severity: "warning",
      applicableCategories: [],
      conditions: [],
      action: { action: "defer", acceptedActions: ["defer"], rationale: "Test 2" },
      priority: 1,
      isActive: true,
      createdBy: "admin",
      createdAt: clock.now(),
      updatedAt: clock.now(),
    });

    await repo.create(rule1.value);
    await repo.create(rule2.value);

    const result = await useCase.execute();
    expect(result.ok).toBe(true);
    expect(result.value).toHaveLength(2);
  });
});

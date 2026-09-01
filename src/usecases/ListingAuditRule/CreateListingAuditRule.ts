/**
 * CreateListingAuditRule use case - create a new context-aware rule.
 * STORY-083: Listing Audit: non-binary, context-aware ground truth.
 */

import { Result } from "@/domain/shared/Result";
import type { ListingAuditRuleRepository, ListingAuditRuleRepositoryError } from "@/ports/repositories/ListingAuditRuleRepository";
import { createListingAuditRule, type CreateListingAuditRuleParams, type ListingAuditRule } from "@/domain/entities/ListingAuditRule";
import type { IdGenerator } from "@/ports/system/IdGenerator";
import type { Clock } from "@/ports/system/Clock";

export interface CreateListingAuditRuleInput extends Omit<CreateListingAuditRuleParams, "id" | "createdAt" | "updatedAt" | "createdBy"> {
  createdBy: string;
}

export class CreateListingAuditRule {
  constructor(
    private readonly ruleRepo: ListingAuditRuleRepository,
    private readonly idGen: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: CreateListingAuditRuleInput): Promise<Result<ListingAuditRule, ListingAuditRuleRepositoryError>> {
    const now = this.clock.now();
    const id = this.idGen.newId();

    const ruleResult = createListingAuditRule({
      id,
      ruleId: input.ruleId,
      dimension: input.dimension,
      severity: input.severity,
      applicableCategories: input.applicableCategories,
      conditions: input.conditions,
      action: input.action,
      priority: input.priority,
      isActive: input.isActive,
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
    });

    if (!ruleResult.ok) {
      return Result.err({ kind: "DATABASE_ERROR", message: "Invalid rule data" });
    }

    return this.ruleRepo.create(ruleResult.value);
  }
}

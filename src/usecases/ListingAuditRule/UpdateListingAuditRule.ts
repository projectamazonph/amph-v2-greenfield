/**
 * UpdateListingAuditRule use case - update an existing rule.
 * STORY-083: Listing Audit: non-binary, context-aware ground truth.
 */

import { Result } from "@/domain/shared/Result";
import type { ListingAuditRuleRepository, ListingAuditRuleRepositoryError } from "@/ports/repositories/ListingAuditRuleRepository";
import { createListingAuditRule, type ListingAuditRule } from "@/domain/entities/ListingAuditRule";
import type { Clock } from "@/ports/system/Clock";

export interface UpdateListingAuditRuleInput {
  id: string;
  ruleId?: string;
  dimension?: string;
  severity?: string;
  applicableCategories?: readonly string[];
  conditions?: readonly any[];
  action?: any;
  priority?: number;
  isActive?: boolean;
}

export class UpdateListingAuditRule {
  constructor(
    private readonly ruleRepo: ListingAuditRuleRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: UpdateListingAuditRuleInput): Promise<Result<ListingAuditRule, ListingAuditRuleRepositoryError>> {
    const existingResult = await this.ruleRepo.getById(input.id);
    if (!existingResult.ok || !existingResult.value) {
      return Result.err({ kind: "NOT_FOUND", id: input.id });
    }

    const existing = existingResult.value;
    const now = this.clock.now();

    const ruleResult = createListingAuditRule({
      id: existing.id,
      ruleId: input.ruleId ?? existing.ruleId,
      dimension: input.dimension ?? existing.dimension,
      severity: input.severity ?? existing.severity,
      applicableCategories: input.applicableCategories ?? existing.applicableCategories,
      conditions: input.conditions ?? existing.conditions,
      action: input.action ?? existing.action,
      priority: input.priority ?? existing.priority,
      isActive: input.isActive ?? existing.isActive,
      createdBy: existing.createdBy,
      createdAt: existing.createdAt,
      updatedAt: now,
    });

    if (!ruleResult.ok) {
      return Result.err({ kind: "DATABASE_ERROR", message: "Invalid rule data" });
    }

    return this.ruleRepo.update(input.id, ruleResult.value);
  }
}

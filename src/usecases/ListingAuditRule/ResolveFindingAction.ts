/**
 * ResolveFindingAction use case - resolve expected action for a finding using rules.
 * STORY-083: Listing Audit: non-binary, context-aware ground truth.
 *
 * This is the core use case that replaces the binary ground truth with
 * context-aware rule evaluation.
 */

import { Result } from "@/domain/shared/Result";
import type { ListingAuditRuleRepository, ListingAuditRuleRepositoryError } from "@/ports/repositories/ListingAuditRuleRepository";
import type { CategoryVariant, RuleDimension, FindingSeverity, FindingAction } from "@/domain/simulator/listing-audit/ListingAuditOutput";
import { resolveExpectedAction } from "@/domain/entities/ListingAuditRule";

export interface ResolveFindingActionInput {
  ruleId: string;
  dimension: RuleDimension;
  severity: FindingSeverity;
  context: {
    category: CategoryVariant;
    imagesCount: number;
    hasAPlus: boolean;
    hasVideo: boolean;
    price?: number;
    seasonalPeriod?: string;
    attributes: Readonly<Record<string, string>>;
  };
}

export interface ResolvedFindingAction {
  expectedAction: FindingAction;
  acceptedActions: readonly FindingAction[];
  rationale: string;
  ruleId?: string;
}

export class ResolveFindingAction {
  constructor(private readonly ruleRepo: ListingAuditRuleRepository) {}

  async execute(input: ResolveFindingActionInput): Promise<Result<ResolvedFindingAction, ListingAuditRuleRepositoryError>> {
    // Get all rules matching this finding
    const rulesResult = await this.ruleRepo.getByFinding(
      input.ruleId,
      input.dimension,
      input.severity,
    );

    if (!rulesResult.ok) {
      return Result.err(rulesResult.error);
    }

    const result = resolveExpectedAction(
      rulesResult.value,
      {
        ruleId: input.ruleId,
        dimension: input.dimension,
        severity: input.severity,
      },
      input.context,
    );

    return Result.ok({
      expectedAction: result.expectedAction,
      acceptedActions: result.acceptedActions,
      rationale: result.rationale,
      ruleId: rulesResult.value.length > 0 ? rulesResult.value[0].id : undefined,
    });
  }
}

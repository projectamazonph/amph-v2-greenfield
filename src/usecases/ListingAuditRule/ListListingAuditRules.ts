/**
 * ListListingAuditRules use case - list all rules.
 * STORY-083: Listing Audit: non-binary, context-aware ground truth.
 */

import { Result } from "@/domain/shared/Result";
import type { ListingAuditRuleRepository, ListingAuditRuleRepositoryError } from "@/ports/repositories/ListingAuditRuleRepository";
import type { ListingAuditRule } from "@/domain/entities/ListingAuditRule";

export class ListListingAuditRules {
  constructor(private readonly ruleRepo: ListingAuditRuleRepository) {}

  async execute(): Promise<Result<readonly ListingAuditRule[], ListingAuditRuleRepositoryError>> {
    return this.ruleRepo.listAll();
  }
}

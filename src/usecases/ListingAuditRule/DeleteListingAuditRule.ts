/**
 * DeleteListingAuditRule use case - delete a rule.
 * STORY-083: Listing Audit: non-binary, context-aware ground truth.
 */

import { Result } from "@/domain/shared/Result";
import type { ListingAuditRuleRepository, ListingAuditRuleRepositoryError } from "@/ports/repositories/ListingAuditRuleRepository";

export class DeleteListingAuditRule {
  constructor(private readonly ruleRepo: ListingAuditRuleRepository) {}

  async execute(id: string): Promise<Result<void, ListingAuditRuleRepositoryError>> {
    return this.ruleRepo.delete(id);
  }
}

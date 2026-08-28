/**
 * GetListingAuditRule use case - retrieve a rule by ID.
 * STORY-083: Listing Audit: non-binary, context-aware ground truth.
 */

import { Result } from "@/domain/shared/Result";
import type { ListingAuditRuleRepository, ListingAuditRuleRepositoryError } from "@/ports/repositories/ListingAuditRuleRepository";
import type { ListingAuditRule } from "@/domain/entities/ListingAuditRule";

export class GetListingAuditRule {
  constructor(private readonly ruleRepo: ListingAuditRuleRepository) {}

  async execute(id: string): Promise<Result<ListingAuditRule | null, ListingAuditRuleRepositoryError>> {
    return this.ruleRepo.getById(id);
  }
}

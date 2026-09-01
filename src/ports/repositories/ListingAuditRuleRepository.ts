/**
 * ListingAuditRuleRepository - Port interface for persisting ListingAuditRule entities.
 * STORY-083: Listing Audit: non-binary, context-aware ground truth.
 *
 * This is a PORT - only interfaces, no implementations.
 * Implementations exist in src/infra/repositories/.
 */

import { Result } from "@/domain/shared/Result";
import type { ListingAuditRule, ListingAuditRuleError } from "@/domain/entities/ListingAuditRule";

export type ListingAuditRuleRepositoryError =
  | { kind: "DATABASE_ERROR"; message: string; cause?: Error }
  | { kind: "NOT_FOUND"; id: string }
  | ListingAuditRuleError;

export interface ListingAuditRuleRepository {
  /**
   * Create a new rule.
   */
  create(rule: ListingAuditRule): Promise<Result<ListingAuditRule, ListingAuditRuleRepositoryError>>;

  /**
   * Get a rule by ID.
   */
  getById(id: string): Promise<Result<ListingAuditRule | null, ListingAuditRuleRepositoryError>>;

  /**
   * Get rules by ruleId (finding rule identifier).
   */
  getByRuleId(ruleId: string): Promise<Result<readonly ListingAuditRule[], ListingAuditRuleRepositoryError>>;

  /**
   * Get all active rules.
   */
  listActive(): Promise<Result<readonly ListingAuditRule[], ListingAuditRuleRepositoryError>>;

  /**
   * Get all rules (including inactive).
   */
  listAll(): Promise<Result<readonly ListingAuditRule[], ListingAuditRuleRepositoryError>>;

  /**
   * Update an existing rule.
   */
  update(
    id: string,
    data: Partial<Omit<ListingAuditRule, "id" | "createdAt" | "updatedAt" | "createdBy">>,
  ): Promise<Result<ListingAuditRule, ListingAuditRuleRepositoryError>>;

  /**
   * Delete a rule by ID.
   */
  delete(id: string): Promise<Result<void, ListingAuditRuleRepositoryError>>;

  /**
   * Get rules matching a specific finding context (ruleId + dimension + severity).
   */
  getByFinding(
    ruleId: string,
    dimension: string,
    severity: string,
  ): Promise<Result<readonly ListingAuditRule[], ListingAuditRuleRepositoryError>>;
}

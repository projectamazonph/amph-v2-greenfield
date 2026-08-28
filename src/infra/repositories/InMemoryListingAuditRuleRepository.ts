/**
 * InMemoryListingAuditRuleRepository - In-memory adapter for ListingAuditRuleRepository.
 * STORY-083: Listing Audit: non-binary, context-aware ground truth.
 *
 * This is an INFRASTRUCTURE adapter - implements the port interface.
 * Used for testing.
 */

import { Result } from "@/domain/shared/Result";
import type {
  ListingAuditRule,
  ListingAuditRuleRepository,
  ListingAuditRuleRepositoryError,
} from "@/domain/entities/ListingAuditRule";

export class InMemoryListingAuditRuleRepository implements ListingAuditRuleRepository {
  private rules = new Map<string, ListingAuditRule>();
  private ruleIdIndex = new Map<string, Set<string>>();
  private findingIndex = new Map<string, Set<string>>();

  private buildFindingKey(ruleId: string, dimension: string, severity: string): string {
    return `${ruleId}:${dimension}:${severity}`;
  }

  async create(rule: ListingAuditRule): Promise<Result<ListingAuditRule, ListingAuditRuleRepositoryError>> {
    this.rules.set(rule.id, rule);
    
    // Index by ruleId
    if (!this.ruleIdIndex.has(rule.ruleId)) {
      this.ruleIdIndex.set(rule.ruleId, new Set());
    }
    this.ruleIdIndex.get(rule.ruleId)!.add(rule.id);
    
    // Index by finding
    const findingKey = this.buildFindingKey(rule.ruleId, rule.dimension, rule.severity);
    if (!this.findingIndex.has(findingKey)) {
      this.findingIndex.set(findingKey, new Set());
    }
    this.findingIndex.get(findingKey)!.add(rule.id);
    
    return Result.ok(rule);
  }

  async getById(id: string): Promise<Result<ListingAuditRule | null, ListingAuditRuleRepositoryError>> {
    return Result.ok(this.rules.get(id) ?? null);
  }

  async getByRuleId(ruleId: string): Promise<Result<readonly ListingAuditRule[], ListingAuditRuleRepositoryError>> {
    const ids = this.ruleIdIndex.get(ruleId) ?? new Set();
    const result: ListingAuditRule[] = [];
    for (const id of ids) {
      const rule = this.rules.get(id);
      if (rule) result.push(rule);
    }
    return Result.ok(result as readonly ListingAuditRule[]);
  }

  async listActive(): Promise<Result<readonly ListingAuditRule[], ListingAuditRuleRepositoryError>> {
    const result: ListingAuditRule[] = [];
    for (const rule of this.rules.values()) {
      if (rule.isActive) result.push(rule);
    }
    result.sort((a, b) => a.priority - b.priority);
    return Result.ok(result as readonly ListingAuditRule[]);
  }

  async listAll(): Promise<Result<readonly ListingAuditRule[], ListingAuditRuleRepositoryError>> {
    const result = [...this.rules.values()];
    result.sort((a, b) => a.priority - b.priority);
    return Result.ok(result as readonly ListingAuditRule[]);
  }

  async update(
    id: string,
    data: Partial<Omit<ListingAuditRule, "id" | "createdAt" | "updatedAt" | "createdBy">>,
  ): Promise<Result<ListingAuditRule, ListingAuditRuleRepositoryError>> {
    const existing = this.rules.get(id);
    if (!existing) {
      return Result.err({ kind: "NOT_FOUND", id });
    }
    
    const updated: ListingAuditRule = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };
    
    this.rules.set(id, updated);
    return Result.ok(updated);
  }

  async delete(id: string): Promise<Result<void, ListingAuditRuleRepositoryError>> {
    const rule = this.rules.get(id);
    if (!rule) {
      return Result.err({ kind: "NOT_FOUND", id });
    }
    
    this.rules.delete(id);
    
    // Remove from indexes
    this.ruleIdIndex.get(rule.ruleId)?.delete(id);
    const findingKey = this.buildFindingKey(rule.ruleId, rule.dimension, rule.severity);
    this.findingIndex.get(findingKey)?.delete(id);
    
    return Result.ok(undefined);
  }

  async getByFinding(
    ruleId: string,
    dimension: string,
    severity: string,
  ): Promise<Result<readonly ListingAuditRule[], ListingAuditRuleRepositoryError>> {
    const findingKey = this.buildFindingKey(ruleId, dimension, severity);
    const ids = this.findingIndex.get(findingKey) ?? new Set();
    const result: ListingAuditRule[] = [];
    for (const id of ids) {
      const rule = this.rules.get(id);
      if (rule) result.push(rule);
    }
    result.sort((a, b) => a.priority - b.priority);
    return Result.ok(result as readonly ListingAuditRule[]);
  }

  // Test helper
  clear(): void {
    this.rules.clear();
    this.ruleIdIndex.clear();
    this.findingIndex.clear();
  }
}

/**
 * PrismaListingAuditRuleRepository - Prisma adapter for ListingAuditRuleRepository.
 * STORY-083: Listing Audit: non-binary, context-aware ground truth.
 *
 * This is an INFRASTRUCTURE adapter - implements the port interface.
 */

import type { PrismaClient } from "@prisma/client";
import { Result } from "@/domain/shared/Result";
import type {
  ListingAuditRule,
  ListingAuditRuleRepository,
  ListingAuditRuleRepositoryError,
} from "@/domain/entities/ListingAuditRule";

export class PrismaListingAuditRuleRepository implements ListingAuditRuleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private mapRow(row: any): ListingAuditRule {
    return {
      id: row.id,
      ruleId: row.ruleId,
      dimension: row.dimension,
      severity: row.severity,
      applicableCategories: row.applicableCategories as readonly string[],
      conditions: row.conditions as readonly any[],
      action: row.action as any,
      priority: row.priority,
      isActive: row.isActive,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async create(rule: ListingAuditRule): Promise<Result<ListingAuditRule, ListingAuditRuleRepositoryError>> {
    try {
      const row = await this.prisma.listingAuditRule.create({
        data: {
          id: rule.id,
          ruleId: rule.ruleId,
          dimension: rule.dimension,
          severity: rule.severity,
          applicableCategories: rule.applicableCategories,
          conditions: rule.conditions,
          action: rule.action,
          priority: rule.priority,
          isActive: rule.isActive,
          createdBy: rule.createdBy,
          createdAt: rule.createdAt,
          updatedAt: rule.updatedAt,
        },
      });
      return Result.ok(this.mapRow(row));
    } catch (error) {
      return Result.err({
        kind: "DATABASE_ERROR",
        message: "Failed to create listing audit rule",
        cause: error instanceof Error ? error : undefined,
      });
    }
  }

  async getById(id: string): Promise<Result<ListingAuditRule | null, ListingAuditRuleRepositoryError>> {
    try {
      const row = await this.prisma.listingAuditRule.findUnique({
        where: { id },
      });
      return Result.ok(row ? this.mapRow(row) : null);
    } catch (error) {
      return Result.err({
        kind: "DATABASE_ERROR",
        message: "Failed to get listing audit rule by ID",
        cause: error instanceof Error ? error : undefined,
      });
    }
  }

  async getByRuleId(ruleId: string): Promise<Result<readonly ListingAuditRule[], ListingAuditRuleRepositoryError>> {
    try {
      const rows = await this.prisma.listingAuditRule.findMany({
        where: { ruleId },
        orderBy: { priority: "asc" },
      });
      return Result.ok(rows.map(this.mapRow));
    } catch (error) {
      return Result.err({
        kind: "DATABASE_ERROR",
        message: "Failed to get listing audit rules by ruleId",
        cause: error instanceof Error ? error : undefined,
      });
    }
  }

  async listActive(): Promise<Result<readonly ListingAuditRule[], ListingAuditRuleRepositoryError>> {
    try {
      const rows = await this.prisma.listingAuditRule.findMany({
        where: { isActive: true },
        orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
      });
      return Result.ok(rows.map(this.mapRow));
    } catch (error) {
      return Result.err({
        kind: "DATABASE_ERROR",
        message: "Failed to list active listing audit rules",
        cause: error instanceof Error ? error : undefined,
      });
    }
  }

  async listAll(): Promise<Result<readonly ListingAuditRule[], ListingAuditRuleRepositoryError>> {
    try {
      const rows = await this.prisma.listingAuditRule.findMany({
        orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
      });
      return Result.ok(rows.map(this.mapRow));
    } catch (error) {
      return Result.err({
        kind: "DATABASE_ERROR",
        message: "Failed to list all listing audit rules",
        cause: error instanceof Error ? error : undefined,
      });
    }
  }

  async update(
    id: string,
    data: Partial<Omit<ListingAuditRule, "id" | "createdAt" | "updatedAt" | "createdBy">>,
  ): Promise<Result<ListingAuditRule, ListingAuditRuleRepositoryError>> {
    try {
      const row = await this.prisma.listingAuditRule.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });
      return Result.ok(this.mapRow(row));
    } catch (error) {
      return Result.err({
        kind: "DATABASE_ERROR",
        message: "Failed to update listing audit rule",
        cause: error instanceof Error ? error : undefined,
      });
    }
  }

  async delete(id: string): Promise<Result<void, ListingAuditRuleRepositoryError>> {
    try {
      await this.prisma.listingAuditRule.delete({
        where: { id },
      });
      return Result.ok(undefined);
    } catch (error) {
      return Result.err({
        kind: "DATABASE_ERROR",
        message: "Failed to delete listing audit rule",
        cause: error instanceof Error ? error : undefined,
      });
    }
  }

  async getByFinding(
    ruleId: string,
    dimension: string,
    severity: string,
  ): Promise<Result<readonly ListingAuditRule[], ListingAuditRuleRepositoryError>> {
    try {
      const rows = await this.prisma.listingAuditRule.findMany({
        where: {
          ruleId,
          dimension,
          severity,
        },
        orderBy: { priority: "asc" },
      });
      return Result.ok(rows.map(this.mapRow));
    } catch (error) {
      return Result.err({
        kind: "DATABASE_ERROR",
        message: "Failed to get listing audit rules by finding",
        cause: error instanceof Error ? error : undefined,
      });
    }
  }
}

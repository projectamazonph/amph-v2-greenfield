/**
 * PrismaDiscountCodeRepository, production adapter for IDiscountCodeRepository.
 *
 * STORY-024: Discount code model + repository + apply in checkout.
 * STORY-050d / P0-2 follow-up: listAll/findById/update/archive were stubs
 * because the discount_codes table had no way to represent "archived"
 * (InMemoryDiscountCodeRepository tracks it with a separate in-process
 * Set). Migration 20260722010000_discount_code_archived_at adds a
 * nullable archivedAt column: null means active, a timestamp means
 * archived. findByCode() intentionally does not filter on archivedAt,
 * matching InMemoryDiscountCodeRepository's existing contract.
 */

import { PrismaClient } from "@prisma/client";
import { Result } from "@/domain/shared/Result";
import type {
  IDiscountCodeRepository,
  DiscountCodeRepositoryError,
} from "@/ports/repositories/IDiscountCodeRepository";
import type { DiscountCode } from "@/domain/entities/DiscountCode";

export class PrismaDiscountCodeRepository implements IDiscountCodeRepository {
  constructor(private readonly db: PrismaClient) {}

  async listAll(): Promise<Result<DiscountCode[], DiscountCodeRepositoryError>> {
    try {
      const rows = await this.db.discountCode.findMany({
        where: { archivedAt: null },
      });
      return Result.ok(rows.map((r) => this.mapRow(r)));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async findById(id: string): Promise<Result<DiscountCode | null, DiscountCodeRepositoryError>> {
    try {
      const row = await this.db.discountCode.findUnique({ where: { id } });
      if (!row || row.archivedAt !== null) return Result.ok(null);
      return Result.ok(this.mapRow(row));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async findByCode(code: string): Promise<DiscountCode | null> {
    const row = await this.db.discountCode.findUnique({
      where: { code: code.toUpperCase() },
    });
    if (!row) return null;
    return this.mapRow(row);
  }

  async create(code: DiscountCode): Promise<Result<DiscountCode, DiscountCodeRepositoryError>> {
    try {
      const row = await this.db.discountCode.create({
        data: {
          id: code.id,
          code: code.code,
          type: code.type,
          value: code.value,
          maxUses: code.maxUses,
          usedCount: code.usedCount,
          validFrom: code.validFrom,
          validUntil: code.validUntil,
          courseIds: [...code.courseIds],
        },
      });
      return Result.ok(this.mapRow(row));
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code: string }).code === "P2002"
      ) {
        return Result.err({ kind: "code_taken" });
      }
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async update(code: DiscountCode): Promise<Result<void, DiscountCodeRepositoryError>> {
    try {
      await this.db.discountCode.update({
        where: { id: code.id },
        data: {
          code: code.code,
          type: code.type,
          value: code.value,
          maxUses: code.maxUses,
          validFrom: code.validFrom,
          validUntil: code.validUntil,
          courseIds: [...code.courseIds],
        },
      });
      return Result.ok(undefined);
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code: string }).code === "P2002"
      ) {
        return Result.err({ kind: "code_taken" });
      }
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code: string }).code === "P2025"
      ) {
        return Result.err({ kind: "not_found" });
      }
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async archive(id: string): Promise<Result<void, DiscountCodeRepositoryError>> {
    try {
      await this.db.discountCode.update({
        where: { id },
        data: { archivedAt: new Date() },
      });
      return Result.ok(undefined);
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code: string }).code === "P2025"
      ) {
        return Result.err({ kind: "not_found" });
      }
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async incrementUsedCount(
    codeId: string,
  ): Promise<Result<DiscountCode, DiscountCodeRepositoryError>> {
    try {
      const row = await this.db.discountCode.update({
        where: { id: codeId },
        data: { usedCount: { increment: 1 } },
      });
      return Result.ok(this.mapRow(row));
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code: string }).code === "P2025"
      ) {
        return Result.err({ kind: "not_found" });
      }
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  private mapRow(row: {
    id: string;
    code: string;
    type: string;
    value: number;
    maxUses: number | null;
    usedCount: number;
    validFrom: Date | null;
    validUntil: Date | null;
    courseIds: string[];
    createdAt: Date;
  }): DiscountCode {
    return {
      id: row.id,
      code: row.code,
      type: row.type as DiscountCode["type"],
      value: row.value,
      maxUses: row.maxUses,
      usedCount: row.usedCount,
      validFrom: row.validFrom,
      validUntil: row.validUntil,
      courseIds: Object.freeze([...row.courseIds]),
      createdAt: row.createdAt,
    };
  }
}

/**
 * PrismaDiscountCodeRepository — production adapter for IDiscountCodeRepository.
 *
 * STORY-024: Discount code model + repository + apply in checkout.
 * STORY-050d: stub for listAll, findById, update, archive.
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

  // STORY-050d: stub
  async listAll(): Promise<Result<DiscountCode[], DiscountCodeRepositoryError>> {
    throw new Error("Not implemented: PrismaDiscountCodeRepository.listAll");
  }

  // STORY-050d: stub
  async findById(): Promise<Result<DiscountCode | null, DiscountCodeRepositoryError>> {
    throw new Error("Not implemented: PrismaDiscountCodeRepository.findById");
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

  // STORY-050d: stub
  async update(): Promise<Result<void, DiscountCodeRepositoryError>> {
    throw new Error("Not implemented: PrismaDiscountCodeRepository.update");
  }

  // STORY-050d: stub
  async archive(): Promise<Result<void, DiscountCodeRepositoryError>> {
    throw new Error("Not implemented: PrismaDiscountCodeRepository.archive");
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

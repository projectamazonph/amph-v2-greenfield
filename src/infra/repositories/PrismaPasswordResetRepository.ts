/**
 * PrismaPasswordResetRepository — production adapter for
 * PasswordResetRepository.
 *
 * STORY-008: password-reset tokens.
 */

import type { PrismaClient } from "@prisma/client";
import { Result } from "@/domain/shared/Result";
import type {
  PasswordResetError,
  PasswordResetRecord,
  PasswordResetRepository,
} from "@/ports/repositories/PasswordResetRepository";

export class PrismaPasswordResetRepository implements PasswordResetRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(args: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<Result<{ id: string }, PasswordResetError>> {
    try {
      const row = await this.db.passwordReset.create({
        data: {
          userId: args.userId,
          tokenHash: args.tokenHash,
          expiresAt: args.expiresAt,
        },
      });
      return Result.ok({ id: row.id });
    } catch (err: unknown) {
      return Result.err({
        kind: "db_error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async findByTokenHash(
    tokenHash: string,
  ): Promise<Result<PasswordResetRecord, PasswordResetError>> {
    try {
      const row = await this.db.passwordReset.findUnique({
        where: { tokenHash },
      });
      if (!row) {
        return Result.err({ kind: "not_found" });
      }
      return Result.ok(this.mapRow(row));
    } catch (err: unknown) {
      return Result.err({
        kind: "db_error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async markUsed(id: string): Promise<Result<void, PasswordResetError>> {
    try {
      await this.db.passwordReset.updateMany({
        where: { id, usedAt: null },
        data: { usedAt: new Date() },
      });
      return Result.ok(undefined);
    } catch (err: unknown) {
      return Result.err({
        kind: "db_error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async invalidateAllForUser(
    userId: string,
  ): Promise<Result<{ count: number }, PasswordResetError>> {
    try {
      const result = await this.db.passwordReset.updateMany({
        where: { userId, usedAt: null },
        data: { usedAt: new Date() },
      });
      return Result.ok({ count: result.count });
    } catch (err: unknown) {
      return Result.err({
        kind: "db_error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  private mapRow(row: {
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    usedAt: Date | null;
    createdAt: Date;
  }): PasswordResetRecord {
    return {
      id: row.id,
      userId: row.userId,
      tokenHash: row.tokenHash,
      expiresAt: row.expiresAt,
      usedAt: row.usedAt,
      createdAt: row.createdAt,
    };
  }
}

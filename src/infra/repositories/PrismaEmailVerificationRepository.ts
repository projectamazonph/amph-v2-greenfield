/**
 * PrismaEmailVerificationRepository — production adapter for
 * EmailVerificationRepository.
 *
 * STORY-007: email verification tokens.
 *
 * Maps the Prisma `email_verifications` table to the
 * `EmailVerificationRepository` port. The token is SHA-256
 * hashed by the use case before reaching this repo; we never
 * see the raw token.
 */

import type { PrismaClient } from "@prisma/client";
import { Result } from "@/domain/shared/Result";
import type {
  EmailVerificationError,
  EmailVerificationRecord,
  EmailVerificationRepository,
} from "@/ports/repositories/EmailVerificationRepository";

export class PrismaEmailVerificationRepository
  implements EmailVerificationRepository
{
  constructor(private readonly db: PrismaClient) {}

  async create(args: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<Result<{ id: string }, EmailVerificationError>> {
    try {
      const row = await this.db.emailVerification.create({
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
  ): Promise<Result<EmailVerificationRecord, EmailVerificationError>> {
    try {
      const row = await this.db.emailVerification.findUnique({
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

  async markUsed(id: string): Promise<Result<void, EmailVerificationError>> {
    try {
      // Idempotent: updateMany + filter on usedAt being null means
      // a second call is a no-op without a unique-constraint error.
      await this.db.emailVerification.updateMany({
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

  private mapRow(row: {
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    usedAt: Date | null;
    createdAt: Date;
  }): EmailVerificationRecord {
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

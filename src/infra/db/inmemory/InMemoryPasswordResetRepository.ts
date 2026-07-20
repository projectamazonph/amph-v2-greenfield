/**
 * In-memory implementation of PasswordResetRepository — STORY-008.
 *
 * Used in unit tests and as a local-dev swap. Persists nothing.
 */

import type {
  PasswordResetError,
  PasswordResetRecord,
  PasswordResetRepository,
} from "@/ports/repositories/PasswordResetRepository";
import { Result } from "@/domain/shared/Result";

let _seq = 0;
const nextId = (): string => `password-reset-${++_seq}-${Date.now().toString(36)}`;

export class InMemoryPasswordResetRepository
  implements PasswordResetRepository
{
  private records = new Map<string, PasswordResetRecord>();
  private byHash = new Map<string, string>();

  async create(args: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<Result<{ id: string }, PasswordResetError>> {
    const id = nextId();
    const record: PasswordResetRecord = {
      id,
      userId: args.userId,
      tokenHash: args.tokenHash,
      expiresAt: args.expiresAt,
      usedAt: null,
      createdAt: new Date(),
    };
    this.records.set(id, record);
    this.byHash.set(args.tokenHash, id);
    return Result.ok({ id });
  }

  async findByTokenHash(
    tokenHash: string,
  ): Promise<Result<PasswordResetRecord, PasswordResetError>> {
    const id = this.byHash.get(tokenHash);
    if (!id) {
      return Result.err({ kind: "not_found" });
    }
    const record = this.records.get(id);
    if (!record) {
      return Result.err({ kind: "not_found" });
    }
    return Result.ok(record);
  }

  async markUsed(id: string): Promise<Result<void, PasswordResetError>> {
    const record = this.records.get(id);
    if (!record) {
      return Result.err({ kind: "not_found" });
    }
    if (record.usedAt === null) {
      this.records.set(id, { ...record, usedAt: new Date() });
    }
    return Result.ok(undefined);
  }

  async invalidateAllForUser(
    userId: string,
  ): Promise<Result<{ count: number }, PasswordResetError>> {
    let count = 0;
    for (const [id, record] of this.records) {
      if (record.userId === userId && record.usedAt === null) {
        this.records.set(id, { ...record, usedAt: new Date() });
        count += 1;
      }
    }
    return Result.ok({ count });
  }
}

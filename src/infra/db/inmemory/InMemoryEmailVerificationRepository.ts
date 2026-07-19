/**
 * In-memory implementation of EmailVerificationRepository — STORY-007.
 *
 * Used in unit tests and as a quick local-dev swap. Persists nothing
 * to disk; instances are scoped to the test.
 */

import type {
  EmailVerificationError,
  EmailVerificationRecord,
  EmailVerificationRepository,
} from "@/ports/repositories/EmailVerificationRepository";
import { Result } from "@/domain/shared/Result";

let _seq = 0;
const nextId = (): string => `email-verification-${++_seq}-${Date.now().toString(36)}`;

export class InMemoryEmailVerificationRepository
  implements EmailVerificationRepository
{
  private records = new Map<string, EmailVerificationRecord>();
  private byHash = new Map<string, string>(); // tokenHash → id

  async create(args: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<Result<{ id: string }, EmailVerificationError>> {
    const id = nextId();
    const record: EmailVerificationRecord = {
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
  ): Promise<Result<EmailVerificationRecord, EmailVerificationError>> {
    const id = this.byHash.get(tokenHash);
    if (!id) return Result.err({ kind: "not_found" });
    const record = this.records.get(id);
    if (!record) return Result.err({ kind: "not_found" });
    return Result.ok(record);
  }

  async markUsed(
    id: string,
  ): Promise<Result<void, EmailVerificationError>> {
    const record = this.records.get(id);
    if (!record) return Result.err({ kind: "not_found" });
    // Idempotent: re-marking is fine.
    if (record.usedAt) return Result.ok(undefined);
    const updated: EmailVerificationRecord = { ...record, usedAt: new Date() };
    this.records.set(id, updated);
    return Result.ok(undefined);
  }
}

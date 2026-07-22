/**
 * PrismaSessionRepository, production adapter for SessionRepository.
 *
 * P0-2 follow-up: sessions were still on `InMemorySessionRepository` in
 * production. Per-request auth is stateless JWT verification (the signed
 * cookie survives a redeploy on its own), so this gap didn't log anyone
 * out. "Logout everywhere" (`deleteAllForUser`), though, silently lost its
 * record set on every cold start, and any future server-side session
 * listing/revocation feature would have read from an empty store. The
 * `Session` Prisma model already existed; nothing was blocking this.
 */

import { PrismaClient } from "@prisma/client";
import { Result } from "@/domain/shared/Result";
import type {
  SessionRecord,
  SessionRepository,
  SessionError,
} from "@/ports/repositories/SessionRepository";

export class PrismaSessionRepository implements SessionRepository {
  constructor(private readonly db: PrismaClient) {}

  async findById(id: string): Promise<Result<SessionRecord, SessionError>> {
    try {
      const row = await this.db.session.findUnique({ where: { id } });
      if (!row) return Result.err({ kind: "not_found" });
      return Result.ok(this.mapRow(row));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async create(params: {
    id: string;
    userId: string;
    tokenHash: string;
    userAgent?: string;
    ipAddress?: string;
    expiresAt: Date;
  }): Promise<Result<SessionRecord, SessionError>> {
    try {
      const row = await this.db.session.create({
        data: {
          id: params.id,
          userId: params.userId,
          tokenHash: params.tokenHash,
          userAgent: params.userAgent ?? null,
          ipAddress: params.ipAddress ?? null,
          expiresAt: params.expiresAt,
        },
      });
      return Result.ok(this.mapRow(row));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async deleteById(id: string): Promise<Result<void, SessionError>> {
    try {
      await this.db.session.deleteMany({ where: { id } });
      return Result.ok(undefined);
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async deleteAllForUser(userId: string): Promise<Result<void, SessionError>> {
    try {
      await this.db.session.deleteMany({ where: { userId } });
      return Result.ok(undefined);
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  private mapRow(row: {
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    createdAt: Date;
  }): SessionRecord {
    return {
      id: row.id,
      userId: row.userId,
      tokenHash: row.tokenHash,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
    };
  }
}

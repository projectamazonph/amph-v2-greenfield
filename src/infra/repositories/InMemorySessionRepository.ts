/**
 * InMemorySessionRepository — fast, synchronous test adapter for SessionRepository port.
 */

import type { SessionRepository, SessionRecord } from "@/ports/repositories/SessionRepository";
import type { SessionError } from "@/ports/repositories/SessionRepository";
import { Result } from "@/lib/Result";

export class InMemorySessionRepository implements SessionRepository {
  private sessions = new Map<string, SessionRecord>();

  async findById(id: string): Promise<Result<SessionRecord, SessionError>> {
    const s = this.sessions.get(id);
    if (!s) return Result.err({ kind: "not_found" });
    return Result.ok(s);
  }

  async create(params: {
    id: string;
    userId: string;
    tokenHash: string;
    userAgent?: string;
    ipAddress?: string;
    expiresAt: Date;
  }): Promise<Result<SessionRecord, SessionError>> {
    const record: SessionRecord = {
      id: params.id,
      userId: params.userId,
      tokenHash: params.tokenHash,
      expiresAt: params.expiresAt,
      createdAt: new Date(),
    };
    this.sessions.set(params.id, record);
    return Result.ok(record);
  }

  async deleteById(id: string): Promise<Result<void, SessionError>> {
    if (!this.sessions.has(id)) return Result.err({ kind: "not_found" });
    this.sessions.delete(id);
    return Result.ok(undefined);
  }

  async deleteAllForUser(userId: string): Promise<Result<void, SessionError>> {
    for (const [id, session] of this.sessions) {
      if (session.userId === userId) this.sessions.delete(id);
    }
    return Result.ok(undefined);
  }

  size(): number {
    return this.sessions.size;
  }

  clear(): void {
    this.sessions.clear();
  }
}

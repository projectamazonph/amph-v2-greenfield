/**
 * InMemorySessionRepository — fast test adapter for SessionRepository port.
 *
 * The Session entity + port (src/ports/repositories/SessionRepository.ts)
 * were added back in Story 012, but the InMemory adapter was never
 * built. This is the missing piece. STORY-006 / current fix.
 *
 * SOLID: implements the port; no business logic.
 */

import type {
  SessionRecord,
  SessionRepository,
  SessionError,
} from "@/ports/repositories/SessionRepository";
import { Result } from "@/domain/shared/Result";

export class InMemorySessionRepository implements SessionRepository {
  private sessions = new Map<string, SessionRecord>();

  async findById(id: string): Promise<Result<SessionRecord, SessionError>> {
    const record = this.sessions.get(id);
    if (!record) return Result.err({ kind: "not_found" });
    return Result.ok(record);
  }

  async create(params: {
    id: string;
    userId: string;
    tokenHash: string;
    userAgent?: string;
    ipAddress?: string;
    expiresAt: Date;
  }): Promise<Result<SessionRecord, SessionError>> {
    if (this.sessions.has(params.id)) {
      return Result.err({
        kind: "db_error",
        message: `session ${params.id} already exists`,
      });
    }
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
    this.sessions.delete(id);
    return Result.ok(undefined);
  }

  async deleteAllForUser(userId: string): Promise<Result<void, SessionError>> {
    for (const [id, record] of this.sessions) {
      if (record.userId === userId) {
        this.sessions.delete(id);
      }
    }
    return Result.ok(undefined);
  }

  /** Test-only helper: count sessions in memory. */
  size(): number {
    return this.sessions.size;
  }
}

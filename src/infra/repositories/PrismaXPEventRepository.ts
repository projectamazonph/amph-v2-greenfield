/**
 * PrismaXPEventRepository — Story 028.
 *
 * The production adapter for the IXPEventRepository port.
 */

import { PrismaClient } from "@prisma/client";
import { Result } from "@/domain/shared/Result";
import type { IXPEventRepository } from "@/ports/repositories/IXPEventRepository";
import type { XPEvent, XPEventError, XPReason } from "@/domain/entities/XPEvent";

export class PrismaXPEventRepository implements IXPEventRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(event: XPEvent): Promise<Result<XPEvent, XPEventError>> {
    try {
      const row = await this.db.xPEvent.create({
        data: {
          id: event.id,
          userId: event.userId,
          amount: event.amount,
          reason: event.reason,
          refId: event.refId ?? null,
        },
      });
      return Result.ok(this.mapRow(row));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async findByUserId(userId: string): Promise<Result<readonly XPEvent[], XPEventError>> {
    try {
      const rows = await this.db.xPEvent.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
      return Result.ok(rows.map((r) => this.mapRow(r)));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  // ── Private helpers ────────────────────────────────────────

  private mapRow(row: {
    id: string;
    userId: string;
    amount: number;
    reason: string;
    refId: string | null;
    createdAt: Date;
  }): XPEvent {
    return {
      id: row.id,
      userId: row.userId,
      amount: row.amount,
      reason: row.reason as XPReason,
      refId: row.refId ?? undefined,
      createdAt: row.createdAt,
    };
  }
}

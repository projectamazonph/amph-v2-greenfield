/**
 * AwardXP — awards XP to a user for completing an action.
 *
 * STORY-028: XPService + XP display on dashboard.
 *
 * Rules:
 *  1. amount must be > 0 → invalid_amount
 *  2. reason must be a valid XP reason → invalid_reason
 *  3. idempotencyKey must be non-empty → invalid_idempotency_key
 *  4. XPEvent creation + User.totalXp update are one atomic write
 */

import { Result } from "@/domain/shared/Result";
import type { IXPAwardRepository } from "@/ports/repositories/IXPAwardRepository";
import type { IdGenerator } from "@/ports/system/IdGenerator";
import type { Clock } from "@/ports/system/Clock";
import type { XPEvent } from "@/domain/entities/XPEvent";
import { createXPEvent } from "@/domain/entities/XPEvent";
import { XPService } from "@/domain/services/XPService";

export interface AwardXPInput {
  userId: string;
  amount: number;
  reason: string;
  refId?: string;
  idempotencyKey: string;
}

export type AwardXPError =
  | { kind: "invalid_amount" }
  | { kind: "invalid_reason" }
  | { kind: "invalid_idempotency_key" }
  | { kind: "user_not_found" }
  | { kind: "db_error"; message: string };

export type AwardXPResult = Result<
  { xpEvent: XPEvent; totalXp: number; applied: boolean },
  AwardXPError
>;

export interface AwardXPDeps {
  xpAwardRepo: IXPAwardRepository;
  idGen: IdGenerator;
  clock: Clock;
}

export class AwardXP {
  constructor(private readonly deps: AwardXPDeps) {}

  async execute(input: AwardXPInput): Promise<AwardXPResult> {
    if (!Number.isInteger(input.amount) || input.amount <= 0) {
      return Result.err({ kind: "invalid_amount" });
    }

    if (!XPService.isXpReason(input.reason)) {
      return Result.err({ kind: "invalid_reason" });
    }

    const idempotencyKey = input.idempotencyKey.trim();
    if (!idempotencyKey || idempotencyKey.length > 200) {
      return Result.err({ kind: "invalid_idempotency_key" });
    }

    const xpEventResult = createXPEvent({
      id: this.deps.idGen.newId(),
      userId: input.userId,
      amount: input.amount,
      reason: input.reason,
      refId: input.refId,
      createdAt: this.deps.clock.now(),
    });

    if (!xpEventResult.ok) {
      if (xpEventResult.error.kind === "invalid_amount") {
        return Result.err({ kind: "invalid_amount" });
      }
      if (xpEventResult.error.kind === "invalid_user_id") {
        return Result.err({ kind: "user_not_found" });
      }
      return Result.err({ kind: "db_error", message: "Failed to create XP event" });
    }

    try {
      const awardResult = await this.deps.xpAwardRepo.award({
        event: xpEventResult.value,
        idempotencyKey,
      });
      if (!awardResult.ok) {
        if (awardResult.error.kind === "user_not_found") {
          return Result.err({ kind: "user_not_found" });
        }
        return Result.err({ kind: "db_error", message: awardResult.error.message });
      }

      return Result.ok({
        xpEvent: awardResult.value.event,
        totalXp: awardResult.value.totalXp,
        applied: awardResult.value.applied,
      });
    } catch (err: unknown) {
      return Result.err({
        kind: "db_error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

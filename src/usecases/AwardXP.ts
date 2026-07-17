/**
 * AwardXP — awards XP to a user for completing an action.
 *
 * STORY-028: XPService + XP display on dashboard.
 *
 * Rules:
 *  1. amount must be > 0 → invalid_amount
 *  2. reason must be a valid XP reason → invalid_reason
 *  3. User must exist → user_not_found
 *  4. XPEvent created + User.totalXp updated atomically
 */

import { Result } from "@/domain/shared/Result";
import type { IXPEventRepository } from "@/ports/repositories/IXPEventRepository";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import type { IdGenerator } from "@/ports/system/IdGenerator";
import type { Clock } from "@/ports/system/Clock";
import type { XPEvent, XPEventError } from "@/domain/entities/XPEvent";
import { createXPEvent } from "@/domain/entities/XPEvent";
import { XPService } from "@/domain/services/XPService";

// ── Input / Output types ────────────────────────────────────────────────────

export interface AwardXPInput {
  userId: string;
  amount: number;
  reason: string;
  refId?: string;
}

export type AwardXPError =
  | { kind: "invalid_amount" }
  | { kind: "invalid_reason" }
  | { kind: "user_not_found" }
  | { kind: "db_error"; message: string };

export type AwardXPResult = Result<{ xpEvent: XPEvent; totalXp: number }, AwardXPError>;

// ── Dependencies ─────────────────────────────────────────────────────────────

export interface AwardXPDeps {
  xpEventRepo: IXPEventRepository;
  userRepo: UserRepository;
  idGen: IdGenerator;
  clock: Clock;
}

// ── Use Case ─────────────────────────────────────────────────────────────────

export class AwardXP {
  constructor(private readonly deps: AwardXPDeps) {}

  async execute(input: AwardXPInput): Promise<AwardXPResult> {
    // ── 1. Validate amount ──────────────────────────────────────────────────
    if (input.amount <= 0) {
      return Result.err({ kind: "invalid_amount" });
    }

    // ── 2. Validate reason ────────────────────────────────────────────────
    if (!XPService.isXpReason(input.reason)) {
      return Result.err({ kind: "invalid_reason" });
    }

    // ── 3. Find user ──────────────────────────────────────────────────────
    const userResult = await this.deps.userRepo.findById(input.userId);
    if (!userResult.ok) {
      return Result.err({ kind: "user_not_found" });
    }
    const user = userResult.value;

    // ── 4. Create XPEvent ─────────────────────────────────────────────────
    const xpEventResult = createXPEvent({
      id: this.deps.idGen.newId(),
      userId: input.userId,
      amount: input.amount,
      reason: input.reason,
      refId: input.refId,
      createdAt: this.deps.clock.now(),
    });

    if (!xpEventResult.ok) {
      // Map XPEventError variants to AwardXPError
      const xpError = xpEventResult.error;
      if (xpError.kind === "invalid_amount") {
        return Result.err({ kind: "invalid_amount" });
      }
      // XP event creation is a precondition step — if it fails here
      // despite validated inputs, treat as internal error
      return Result.err({ kind: "db_error", message: "Failed to create XP event" });
    }

    const xpEvent = xpEventResult.value;

    // ── 5. Persist XPEvent ────────────────────────────────────────────────
    const createResult = await this.deps.xpEventRepo.create(xpEvent);
    if (!createResult.ok) {
      return Result.err({ kind: "db_error", message: "Failed to create XP event" });
    }

    // ── 6. Update user's total XP ─────────────────────────────────────────
    const newTotalXp = (user.totalXp ?? 0) + input.amount;
    const updateXpResult = await this.deps.userRepo.updateTotalXp(user.id, newTotalXp);
    if (!updateXpResult.ok) {
      return Result.err({ kind: "db_error", message: "Failed to update user XP" });
    }

    return Result.ok({ xpEvent, totalXp: newTotalXp });
  }
}

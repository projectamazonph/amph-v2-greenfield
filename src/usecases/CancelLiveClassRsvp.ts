import { Result } from "@/domain/shared/Result";
import {
  cancelRegistration,
  type LiveClassRegistration,
} from "@/domain/entities/LiveClassRegistration";
import type { ILiveClassRegistrationRepository } from "@/ports/repositories/ILiveClassRegistrationRepository";
import type { Clock } from "@/ports/system/Clock";

/**
 * `CancelLiveClassRsvp` — STORY-091.
 *
 * Cancels an existing RSVP by flipping the row's status to "cancelled".
 * Idempotent — cancelling an already-cancelled registration is a no-op.
 */

export type CancelLiveClassRsvpError =
  | { kind: "not_registered" }
  | { kind: "db_error"; message: string };

export interface CancelLiveClassRsvpInput {
  userId: string;
  liveClassId: string;
}

export interface CancelLiveClassRsvpDeps {
  liveClassRegistrationRepo: ILiveClassRegistrationRepository;
  clock: Clock;
}

export class CancelLiveClassRsvp {
  constructor(private readonly deps: CancelLiveClassRsvpDeps) {}

  async execute(
    input: CancelLiveClassRsvpInput,
  ): Promise<Result<LiveClassRegistration, CancelLiveClassRsvpError>> {
    const existingResult =
      await this.deps.liveClassRegistrationRepo.findByUserAndClass(
        input.userId,
        input.liveClassId,
      );
    if (!existingResult.ok) {
      return Result.err({
        kind: "db_error",
        message: "lookup failed",
      });
    }
    const existing = existingResult.value;
    if (!existing) {
      return Result.err({ kind: "not_registered" });
    }
    if (existing.status === "cancelled") {
      return Result.ok(existing);
    }
    const cancelled = cancelRegistration(existing, this.deps.clock.now());
    const upd = await this.deps.liveClassRegistrationRepo.update(cancelled);
    if (!upd.ok) {
      return Result.err({
        kind: "db_error",
        message: "cancel persist failed",
      });
    }
    return Result.ok(cancelled);
  }
}
import { Result } from "@/domain/shared/Result";
import type { XPEvent } from "@/domain/entities/XPEvent";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import type {
  IXPAwardRepository,
  XPAwardCommand,
  XPAwardWriteError,
  XPAwardWriteResult,
} from "@/ports/repositories/IXPAwardRepository";

export class InMemoryXPAwardRepository implements IXPAwardRepository {
  private readonly awards = new Map<string, XPEvent>();
  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly userRepo: UserRepository) {}

  async award(command: XPAwardCommand): Promise<Result<XPAwardWriteResult, XPAwardWriteError>> {
    return this.withLock(async () => {
      const existing = this.awards.get(command.idempotencyKey);
      if (existing) {
        const userResult = await this.userRepo.findById(existing.userId);
        if (!userResult.ok) return Result.err({ kind: "user_not_found" });
        return Result.ok({ event: existing, totalXp: userResult.value.totalXp, applied: false });
      }

      const userResult = await this.userRepo.findById(command.event.userId);
      if (!userResult.ok) return Result.err({ kind: "user_not_found" });

      const updateResult = await this.userRepo.updateTotalXp(
        command.event.userId,
        userResult.value.totalXp + command.event.amount,
      );
      if (!updateResult.ok) {
        return Result.err({ kind: "db_error", message: "Failed to update user XP" });
      }

      this.awards.set(command.idempotencyKey, command.event);
      return Result.ok({
        event: command.event,
        totalXp: updateResult.value.totalXp,
        applied: true,
      });
    });
  }

  clear(): void {
    this.awards.clear();
  }

  private async withLock<T>(work: () => Promise<T>): Promise<T> {
    const previous = this.queue;
    let release!: () => void;
    this.queue = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return await work();
    } finally {
      release();
    }
  }
}

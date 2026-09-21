import type { UserRepository } from "@/ports/repositories/UserRepository";
import type { Clock } from "@/ports/system/Clock";
import { Result } from "@/domain/shared/Result";

export type CompleteWelcomeError = { kind: "not_found" } | { kind: "repo_error"; message: string };

export class CompleteWelcome {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: {
    userId: string;
  }): Promise<Result<{ completedAt: Date }, CompleteWelcomeError>> {
    const now = this.clock.now();
    const result = await this.userRepo.markWelcomeCompleted(input.userId, now);
    if (!result.ok) {
      if (result.error.kind === "not_found") return Result.err({ kind: "not_found" });
      return Result.err({ kind: "repo_error", message: "unknown" });
    }
    // Use the actual stored value (idempotent — first stamp wins)
    return Result.ok({ completedAt: result.value.welcomeCompletedAt ?? now });
  }
}

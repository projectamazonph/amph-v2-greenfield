import type { UserRepository } from "@/ports/repositories/UserRepository";
import { Result } from "@/domain/shared/Result";

export type ResetWelcomeError = { kind: "not_found" } | { kind: "repo_error"; message: string };

export class ResetWelcome {
  constructor(private readonly userRepo: UserRepository) {}

  async execute(input: { userId: string }): Promise<Result<void, ResetWelcomeError>> {
    const result = await this.userRepo.resetWelcome(input.userId);
    if (!result.ok) {
      if (result.error.kind === "not_found") return Result.err({ kind: "not_found" });
      return Result.err({ kind: "repo_error", message: "unknown" });
    }
    return Result.ok(undefined);
  }
}

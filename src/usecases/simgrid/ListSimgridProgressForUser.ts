/**
 * ListSimgridProgressForUser — read a student's SimGrid attempts.
 *
 * ADR-026: SimGrid integration.
 */

import { Result } from "@/domain/shared/Result";
import type { SimgridAttempt } from "@/domain/simgrid";
import type {
  ISimgridAttemptRepository,
  SimgridAttemptRepositoryError,
} from "@/ports/simgrid/ISimgridAttemptRepository";

export interface ListSimgridProgressForUserInput {
  userId: string;
}

export interface ListSimgridProgressForUserDeps {
  simgridAttemptRepo: ISimgridAttemptRepository;
}

export class ListSimgridProgressForUser {
  constructor(private readonly deps: ListSimgridProgressForUserDeps) {}

  async execute(
    input: ListSimgridProgressForUserInput,
  ): Promise<Result<readonly SimgridAttempt[], SimgridAttemptRepositoryError>> {
    if (!input.userId) {
      return Result.err({ kind: "infrastructure", message: "userId required" });
    }
    return this.deps.simgridAttemptRepo.listForUser(input.userId);
  }
}

/**
 * InMemorySimgridAttemptRepository — fast, synchronous fake for unit tests.
 *
 * ADR-026: SimGrid integration via iframe + postMessage bridge. The bridge
 * forwards summary rows from public/simgrid-v1/ — one row per attempt — and
 * this repo persists them.
 *
 * Lives alongside the production adapter's test directory to mirror the
 * pattern used for other simulator-attempt repos.
 */

import { Result } from "@/domain/shared/Result";
import type { SimgridAttempt, SimgridSimulatorId } from "@/domain/simgrid";
import type {
  ISimgridAttemptRepository,
  SimgridAttemptRepositoryError,
} from "@/ports/simgrid/ISimgridAttemptRepository";

export class InMemorySimgridAttemptRepository implements ISimgridAttemptRepository {
  private readonly byId = new Map<string, SimgridAttempt>();

  async record(attempt: SimgridAttempt): Promise<Result<void, SimgridAttemptRepositoryError>> {
    this.byId.set(attempt.id, attempt);
    return Result.ok(undefined);
  }

  async listForUser(
    userId: string,
  ): Promise<Result<readonly SimgridAttempt[], SimgridAttemptRepositoryError>> {
    const all = Array.from(this.byId.values()).filter((a) => a.userId === userId);
    all.sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());
    return Result.ok(all);
  }

  async getBestForUserAndSimulator(
    userId: string,
    simulatorId: SimgridSimulatorId,
  ): Promise<Result<SimgridAttempt | null, SimgridAttemptRepositoryError>> {
    const matches = Array.from(this.byId.values())
      .filter((a) => a.userId === userId && a.simulatorId === simulatorId)
      .sort((a, b) => b.score - a.score);
    return Result.ok(matches[0] ?? null);
  }
}

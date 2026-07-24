/**
 * InMemorySimulatorAttemptRepository — fast, synchronous fake for unit tests.
 *
 * STORY-064: Simulator Attempt Infrastructure.
 *
 * Uses plain Maps so test runs are instant. Reset between tests by calling
 * .clear(). Pre-populate with .seed() for tests that need existing data.
 */

import { Result } from "@/domain/shared/Result";
import type {
  SimulatorAttempt,
  AttemptStatus,
  ScoreDimensions,
} from "@/domain/entities/SimulatorAttempt";
import type { SimulatorDecision } from "@/domain/entities/SimulatorDecision";
import type { SimulatorId } from "@/domain/entities/SimulatorScenario";
import type {
  ISimulatorAttemptRepository,
  SimulatorAttemptError,
} from "@/ports/repositories/ISimulatorAttemptRepository";

const VALID_TRANSITIONS: Record<AttemptStatus, AttemptStatus[]> = {
  in_progress: ["submitted", "expired"],
  submitted: ["graded"],
  graded: [],
  expired: [],
};

export class InMemorySimulatorAttemptRepository implements ISimulatorAttemptRepository {
  /** Main storage: id -> SimulatorAttempt */
  private attempts = new Map<string, SimulatorAttempt>();

  /** Index: attemptId -> id (human-readable lookup) */
  private attemptIdIndex = new Map<string, string>();

  // ── Test helpers ──────────────────────────────────────────────

  /** Pre-populate the store. Useful for tests that need existing data. */
  seed(attempts: SimulatorAttempt[]): void {
    for (const attempt of attempts) {
      this.attempts.set(attempt.id, { ...attempt });
      this.attemptIdIndex.set(attempt.attemptId, attempt.id);
    }
  }

  /** Clear all data. Call between tests. */
  clear(): void {
    this.attempts.clear();
    this.attemptIdIndex.clear();
  }

  // ── Repository methods ────────────────────────────────────────

  async create(
    attempt: SimulatorAttempt,
  ): Promise<Result<SimulatorAttempt, SimulatorAttemptError>> {
    try {
      const copy: SimulatorAttempt = { ...attempt, decisions: [...attempt.decisions] };
      this.attempts.set(attempt.id, copy);
      this.attemptIdIndex.set(attempt.attemptId, attempt.id);
      return Result.ok(copy);
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async findById(id: string): Promise<Result<SimulatorAttempt | null, SimulatorAttemptError>> {
    const attempt = this.attempts.get(id);
    return Result.ok(attempt ?? null);
  }

  async findByAttemptId(
    attemptId: string,
  ): Promise<Result<SimulatorAttempt | null, SimulatorAttemptError>> {
    const id = this.attemptIdIndex.get(attemptId);
    if (!id) return Result.ok(null);
    const attempt = this.attempts.get(id);
    return Result.ok(attempt ?? null);
  }

  async findByUserAndScenario(
    userId: string,
    simulatorId: SimulatorId,
    scenarioId: string,
    options?: { onlyInProgress?: boolean },
  ): Promise<Result<SimulatorAttempt[], SimulatorAttemptError>> {
    const matches = Array.from(this.attempts.values()).filter(
      (a) =>
        a.userId === userId &&
        a.simulatorId === simulatorId &&
        a.scenarioId === scenarioId &&
        (options?.onlyInProgress ? a.status === "in_progress" : true),
    );
    return Result.ok(matches);
  }

  async addDecision(
    attemptId: string,
    decision: SimulatorDecision,
  ): Promise<Result<void, SimulatorAttemptError>> {
    const attempt = this.attempts.get(attemptId);
    if (!attempt) {
      return Result.err({ kind: "not_found" });
    }

    if (attempt.status === "submitted") {
      return Result.err({ kind: "already_submitted" });
    }

    if (attempt.status === "graded") {
      return Result.err({ kind: "already_graded" });
    }

    // Append decision with correct revision
    const updatedAttempt: SimulatorAttempt = {
      ...attempt,
      decisions: [...attempt.decisions, decision],
    };
    this.attempts.set(attemptId, updatedAttempt);
    return Result.ok(undefined);
  }

  async updateStatus(
    id: string,
    status: AttemptStatus,
    options?: { score?: number; scoreDimensions?: ScoreDimensions },
  ): Promise<Result<SimulatorAttempt, SimulatorAttemptError>> {
    const attempt = this.attempts.get(id);
    if (!attempt) {
      return Result.err({ kind: "not_found" });
    }

    // Validate transition
    const allowed = VALID_TRANSITIONS[attempt.status] ?? [];
    if (!allowed.includes(status)) {
      return Result.err({ kind: "invalid_status_transition" });
    }

    const now = new Date();
    const updatedAttempt: SimulatorAttempt = {
      ...attempt,
      status,
      submittedAt: status === "submitted" ? now : attempt.submittedAt,
      gradedAt: status === "graded" ? now : attempt.gradedAt,
      score: options?.score ?? attempt.score,
      scoreDimensions: options?.scoreDimensions ?? attempt.scoreDimensions,
    };

    this.attempts.set(id, updatedAttempt);
    return Result.ok(updatedAttempt);
  }
}

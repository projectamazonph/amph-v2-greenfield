/**
 * PrismaSimgridAttemptRepository — production adapter for ISimgridAttemptRepository.
 *
 * ADR-026: SimGrid integration via iframe + postMessage bridge.
 *
 * Persists SimgridAttempt rows forwarded by the vendored SimGrid static
 * site (public/simgrid-v1/). Maps Prisma rows to the SimgridAttempt
 * domain entity, expanding nullable columns into optional fields.
 */

import type { PrismaClient } from "@prisma/client";

import { Result } from "@/domain/shared/Result";
import type { SimgridAttempt, SimgridSimulatorId } from "@/domain/simgrid";
import type {
  ISimgridAttemptRepository,
  SimgridAttemptRepositoryError,
} from "@/ports/simgrid/ISimgridAttemptRepository";

interface SimgridAttemptRow {
  id: string;
  userId: string;
  simulatorId: string;
  score: number;
  passed: boolean;
  completedAt: Date;
  scenarioVersion: string;
  rubricVersion: string;
  scenarioId: string | null;
  policyVersion: string | null;
}

function toDomain(row: SimgridAttemptRow): SimgridAttempt {
  return {
    id: row.id,
    userId: row.userId,
    simulatorId: row.simulatorId as SimgridSimulatorId,
    score: row.score,
    passed: row.passed,
    completedAt: row.completedAt,
    scenarioVersion: row.scenarioVersion,
    rubricVersion: row.rubricVersion,
    ...(row.scenarioId !== null ? { scenarioId: row.scenarioId } : {}),
    ...(row.policyVersion !== null ? { policyVersion: row.policyVersion } : {}),
  };
}

export class PrismaSimgridAttemptRepository implements ISimgridAttemptRepository {
  constructor(private readonly db: PrismaClient) {}

  async record(attempt: SimgridAttempt): Promise<Result<void, SimgridAttemptRepositoryError>> {
    try {
      await this.db.simgridAttempt.create({
        data: {
          id: attempt.id,
          userId: attempt.userId,
          simulatorId: attempt.simulatorId,
          score: attempt.score,
          passed: attempt.passed,
          completedAt: attempt.completedAt,
          scenarioVersion: attempt.scenarioVersion,
          rubricVersion: attempt.rubricVersion,
          scenarioId: attempt.scenarioId ?? null,
          policyVersion: attempt.policyVersion ?? null,
        },
      });
      return Result.ok(undefined);
    } catch (err: unknown) {
      return Result.err({ kind: "infrastructure", message: String(err) });
    }
  }

  async listForUser(
    userId: string,
  ): Promise<Result<readonly SimgridAttempt[], SimgridAttemptRepositoryError>> {
    try {
      const rows = await this.db.simgridAttempt.findMany({
        where: { userId },
        orderBy: { completedAt: "desc" },
      });
      return Result.ok(rows.map((r) => toDomain(r as SimgridAttemptRow)));
    } catch (err: unknown) {
      return Result.err({ kind: "infrastructure", message: String(err) });
    }
  }

  async getBestForUserAndSimulator(
    userId: string,
    simulatorId: SimgridSimulatorId,
  ): Promise<Result<SimgridAttempt | null, SimgridAttemptRepositoryError>> {
    try {
      const row = await this.db.simgridAttempt.findFirst({
        where: { userId, simulatorId },
        orderBy: { score: "desc" },
      });
      return Result.ok(row ? toDomain(row as SimgridAttemptRow) : null);
    } catch (err: unknown) {
      return Result.err({ kind: "infrastructure", message: String(err) });
    }
  }
}

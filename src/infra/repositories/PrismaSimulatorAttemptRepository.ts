/**
 * PrismaSimulatorAttemptRepository — production adapter for ISimulatorAttemptRepository.
 *
 * STORY-064: Simulator Attempt Infrastructure.
 *
 * Persists SimulatorAttempt and SimulatorDecision to PostgreSQL.
 * Maps Prisma rows to domain entities using SimulatorAttempt.hydrate().
 */

import { Prisma, PrismaClient } from "@prisma/client";
import { Result } from "@/domain/shared/Result";
import { hydrateSimulatorAttempt } from "@/domain/entities/SimulatorAttempt";
import type { SimulatorAttempt } from "@/domain/entities/SimulatorAttempt";
import type { SimulatorDecision } from "@/domain/entities/SimulatorDecision";
import type { SimulatorId } from "@/domain/entities/SimulatorScenario";
import type {
  ISimulatorAttemptRepository,
  SimulatorAttemptError,
} from "@/ports/repositories/ISimulatorAttemptRepository";

interface PrismaAttemptRow {
  id: string;
  attemptId: string;
  userId: string;
  simulatorId: string;
  scenarioId: string;
  scenarioVersion: number;
  difficulty: string;
  mode: string;
  status: string;
  seed: string | null;
  score: number | null;
  scoreDimensions: Prisma.JsonValue;
  startedAt: Date;
  submittedAt: Date | null;
  gradedAt: Date | null;
  decisions: Array<{
    id: string;
    attemptId: string;
    revision: number;
    decisionData: Prisma.JsonValue;
    submittedAt: Date;
  }>;
}

export class PrismaSimulatorAttemptRepository implements ISimulatorAttemptRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(
    attempt: SimulatorAttempt,
  ): Promise<Result<SimulatorAttempt, SimulatorAttemptError>> {
    try {
      const row = await this.db.simulatorAttempt.create({
        data: {
          id: attempt.id,
          attemptId: attempt.attemptId,
          userId: attempt.userId,
          simulatorId: attempt.simulatorId,
          scenarioId: attempt.scenarioId,
          scenarioVersion: attempt.scenarioVersion,
          difficulty: attempt.difficulty,
          mode: attempt.mode,
          status: attempt.status,
          seed: attempt.seed,
          score: attempt.score,
          scoreDimensions: attempt.scoreDimensions as unknown as Prisma.InputJsonValue,
          startedAt: attempt.startedAt,
          submittedAt: attempt.submittedAt,
          gradedAt: attempt.gradedAt,
          decisions: {
            create: attempt.decisions.map((d) => ({
              id: d.id,
              attemptId: d.attemptId,
              revision: d.revision,
              decisionData: d.decisionData as unknown as Prisma.InputJsonValue,
              submittedAt: d.submittedAt,
            })),
          },
        },
        include: { decisions: { orderBy: { revision: "asc" } } },
      });
      return this.mapRow(row as unknown as PrismaAttemptRow);
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async findById(id: string): Promise<Result<SimulatorAttempt | null, SimulatorAttemptError>> {
    try {
      const row = await this.db.simulatorAttempt.findUnique({
        where: { id },
        include: { decisions: { orderBy: { revision: "asc" } } },
      });
      if (!row) return Result.err({ kind: "not_found" });
      return this.mapRow(row as unknown as PrismaAttemptRow);
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async findByAttemptId(
    attemptId: string,
  ): Promise<Result<SimulatorAttempt | null, SimulatorAttemptError>> {
    try {
      const row = await this.db.simulatorAttempt.findUnique({
        where: { attemptId },
        include: { decisions: { orderBy: { revision: "asc" } } },
      });
      if (!row) return Result.err({ kind: "not_found" });
      return this.mapRow(row as unknown as PrismaAttemptRow);
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async findByUserAndScenario(
    userId: string,
    simulatorId: SimulatorId,
    scenarioId: string,
    options?: { onlyInProgress?: boolean },
  ): Promise<Result<SimulatorAttempt[], SimulatorAttemptError>> {
    try {
      const where: Record<string, unknown> = { userId, simulatorId, scenarioId };
      if (options?.onlyInProgress) {
        where.status = "in_progress";
      }
      const rows = await this.db.simulatorAttempt.findMany({
        where,
        include: { decisions: { orderBy: { revision: "asc" } } },
        orderBy: { startedAt: "desc" },
      });
      return Result.ok(
        rows
          .map((r) => this.mapRow(r as unknown as PrismaAttemptRow))
          .filter((r) => r.ok)
          .map((r) => r.value),
      );
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async addDecision(
    attemptId: string,
    decision: SimulatorDecision,
  ): Promise<Result<void, SimulatorAttemptError>> {
    try {
      // First check the attempt's current status
      const attempt = await this.db.simulatorAttempt.findUnique({
        where: { id: attemptId },
        select: { status: true },
      });

      if (!attempt) {
        return Result.err({ kind: "not_found" });
      }

      if (attempt.status === "submitted") {
        return Result.err({ kind: "already_submitted" });
      }

      if (attempt.status === "graded") {
        return Result.err({ kind: "already_graded" });
      }

      await this.db.simulatorDecision.create({
        data: {
          id: decision.id,
          attemptId: decision.attemptId,
          revision: decision.revision,
          decisionData: decision.decisionData as unknown as Prisma.InputJsonValue,
          submittedAt: decision.submittedAt,
        },
      });

      return Result.ok(undefined);
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code: string }).code === "P2025"
      ) {
        return Result.err({ kind: "not_found" });
      }
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async updateStatus(
    id: string,
    status: string,
    options?: { score?: number; scoreDimensions?: Record<string, unknown> },
  ): Promise<Result<SimulatorAttempt, SimulatorAttemptError>> {
    try {
      // First check the current status to validate the transition
      const current = await this.db.simulatorAttempt.findUnique({ where: { id } });
      if (!current) {
        return Result.err({ kind: "not_found" });
      }

      // Validate transition
      const VALID_TRANSITIONS: Record<string, string[]> = {
        in_progress: ["submitted", "expired"],
        submitted: ["graded"],
        graded: [],
        expired: [],
      };
      const allowed = VALID_TRANSITIONS[current.status] ?? [];
      if (!allowed.includes(status)) {
        return Result.err({ kind: "invalid_status_transition" });
      }

      const row = await this.db.simulatorAttempt.update({
        where: { id },
        data: {
          status,
          submittedAt: status === "submitted" ? new Date() : undefined,
          gradedAt: status === "graded" ? new Date() : undefined,
          score: options?.score,
          scoreDimensions:
            (options?.scoreDimensions as unknown as Prisma.InputJsonValue) ?? undefined,
        },
        include: { decisions: { orderBy: { revision: "asc" } } },
      });
      return this.mapRow(row as unknown as PrismaAttemptRow);
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code: string }).code === "P2025"
      ) {
        return Result.err({ kind: "not_found" });
      }
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  private mapRow(row: PrismaAttemptRow): Result<SimulatorAttempt, SimulatorAttemptError> {
    return Result.ok(
      hydrateSimulatorAttempt({
        id: row.id,
        attemptId: row.attemptId,
        userId: row.userId,
        simulatorId: row.simulatorId as SimulatorId,
        scenarioId: row.scenarioId,
        scenarioVersion: row.scenarioVersion,
        difficulty: row.difficulty as SimulatorAttempt["difficulty"],
        mode: row.mode as SimulatorAttempt["mode"],
        status: row.status as SimulatorAttempt["status"],
        seed: row.seed,
        score: row.score,
        scoreDimensions: row.scoreDimensions as unknown as SimulatorAttempt["scoreDimensions"],
        startedAt: row.startedAt,
        submittedAt: row.submittedAt,
        gradedAt: row.gradedAt,
        decisions: row.decisions.map((d) => ({
          id: d.id,
          attemptId: d.attemptId,
          revision: d.revision,
          decisionData: d.decisionData as unknown as Record<string, unknown>,
          submittedAt: d.submittedAt,
        })),
      }),
    );
  }
}

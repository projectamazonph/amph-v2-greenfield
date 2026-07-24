/**
 * PrismaAttemptFeedbackRepository — Postgres-backed AttemptFeedback persistence.
 *
 * STORY-066: Feedback Composer + Remediation Recommendations.
 *
 * Persists AttemptFeedback with dimensionFeedback and remediationLinks stored
 * as JSON columns. Implements the IAttemptFeedbackRepository port.
 */

import { PrismaClient, type Prisma } from "@prisma/client";
import type { AttemptFeedback, DimensionFeedback } from "@/domain/entities/AttemptFeedback";
import type {
  IAttemptFeedbackRepository,
  AttemptFeedbackError,
} from "@/ports/repositories/IAttemptFeedbackRepository";
import { Result } from "@/domain/shared/Result";
import { hydrateAttemptFeedback } from "@/domain/entities/AttemptFeedback";
import type { SimulatorId } from "@/domain/entities/SimulatorScenario";
import type { Difficulty, SimulatorMode } from "@/domain/entities/SimulatorAttempt";

function toDomain(raw: {
  id: string;
  attemptId: string;
  userId: string;
  simulatorId: string;
  scenarioId: string;
  difficulty: string;
  mode: string;
  overallScore: number;
  passed: boolean;
  overallComment: string;
  remediationLinks: Prisma.JsonValue;
  dimensionFeedback: Prisma.JsonValue;
  completedAt: Date;
}): AttemptFeedback {
  return hydrateAttemptFeedback({
    attemptId: raw.attemptId,
    userId: raw.userId,
    simulatorId: raw.simulatorId as SimulatorId,
    scenarioId: raw.scenarioId,
    difficulty: raw.difficulty as Difficulty,
    mode: raw.mode as SimulatorMode,
    overallScore: raw.overallScore,
    passed: raw.passed,
    overallComment: raw.overallComment,
    remediationLinks: raw.remediationLinks as unknown as readonly string[],
    dimensionFeedback: raw.dimensionFeedback as unknown as readonly DimensionFeedback[],
    completedAt: raw.completedAt,
  });
}

export class PrismaAttemptFeedbackRepository implements IAttemptFeedbackRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(feedback: AttemptFeedback): Promise<Result<void, AttemptFeedbackError>> {
    try {
      await this.prisma.attemptFeedback.create({
        data: {
          attemptId: feedback.attemptId,
          userId: feedback.userId,
          simulatorId: feedback.simulatorId,
          scenarioId: feedback.scenarioId,
          difficulty: feedback.difficulty,
          mode: feedback.mode,
          overallScore: feedback.overallScore,
          passed: feedback.passed,
          overallComment: feedback.overallComment,
          remediationLinks: feedback.remediationLinks as unknown as Prisma.InputJsonValue,
          dimensionFeedback: feedback.dimensionFeedback as unknown as Prisma.InputJsonValue,
          completedAt: feedback.completedAt,
        },
      });
      return Result.ok(undefined);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return Result.err({ kind: "db_error", message: msg });
    }
  }

  async findByAttemptId(
    attemptId: string,
  ): Promise<Result<AttemptFeedback | null, AttemptFeedbackError>> {
    try {
      const raw = await this.prisma.attemptFeedback.findUnique({
        where: { attemptId },
      });
      if (!raw) return Result.ok(null);
      return Result.ok(toDomain(raw));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return Result.err({ kind: "db_error", message: msg });
    }
  }

  async findByUserId(
    userId: string,
    limit?: number,
  ): Promise<Result<readonly AttemptFeedback[], AttemptFeedbackError>> {
    try {
      const rows = await this.prisma.attemptFeedback.findMany({
        where: { userId },
        orderBy: { completedAt: "desc" },
        take: limit,
      });
      return Result.ok(rows.map(toDomain));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return Result.err({ kind: "db_error", message: msg });
    }
  }
}

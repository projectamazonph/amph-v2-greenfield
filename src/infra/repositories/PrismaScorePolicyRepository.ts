/**
 * PrismaScorePolicyRepository — Postgres-backed ScorePolicy persistence.
 *
 * STORY-065: Scoring Engine + Dimensional Policies.
 */

import { PrismaClient, type Prisma } from "@prisma/client";
import type { SimulatorId } from "@/domain/entities/SimulatorScenario";
import type { ScorePolicy, DimensionConfig } from "@/domain/entities/ScorePolicy";
import type { Difficulty, SimulatorMode } from "@/domain/entities/SimulatorAttempt";
import type { SimulatorAttemptError } from "@/domain/entities/SimulatorAttempt";
import type { IScorePolicyRepository } from "@/ports/repositories/IScorePolicyRepository";
import { Result } from "@/domain/shared/Result";
import { hydrateScorePolicy } from "@/domain/entities/ScorePolicy";

// Prisma JsonValue ↔ DimensionConfig map
type DimensionConfigMap = Record<string, DimensionConfig>;

function toDomain(raw: {
  id: string;
  simulatorId: string;
  difficulty: string;
  mode: string;
  dimensionConfig: Prisma.JsonValue;
  passingScore: number;
  createdAt: Date;
  updatedAt: Date;
}): ScorePolicy {
  return hydrateScorePolicy({
    id: raw.id,
    simulatorId: raw.simulatorId as SimulatorId,
    difficulty: raw.difficulty as Difficulty,
    mode: raw.mode as SimulatorMode,
    dimensionConfig: raw.dimensionConfig as unknown as DimensionConfigMap,
    passingScore: raw.passingScore,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  });
}

export class PrismaScorePolicyRepository implements IScorePolicyRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findBySimulatorAndDifficulty(
    simulatorId: SimulatorId,
    difficulty: Difficulty,
    mode: SimulatorMode,
  ): Promise<Result<ScorePolicy | null, SimulatorAttemptError>> {
    try {
      const raw = await this.prisma.scorePolicy.findUnique({
        where: {
          simulatorId_difficulty_mode: {
            simulatorId,
            difficulty,
            mode,
          },
        },
      });
      if (!raw) return Result.ok(null);
      return Result.ok(toDomain(raw));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return Result.err({ kind: "db_error", message: msg });
    }
  }

  async findBySimulator(
    simulatorId: SimulatorId,
  ): Promise<Result<readonly ScorePolicy[], SimulatorAttemptError>> {
    try {
      const rows = await this.prisma.scorePolicy.findMany({
        where: { simulatorId },
      });
      return Result.ok(rows.map(toDomain));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return Result.err({ kind: "db_error", message: msg });
    }
  }

  async create(policy: ScorePolicy): Promise<Result<void, SimulatorAttemptError>> {
    try {
      await this.prisma.scorePolicy.create({
        data: {
          id: policy.id,
          simulatorId: policy.simulatorId,
          difficulty: policy.difficulty,
          mode: policy.mode,
          dimensionConfig: policy.dimensionConfig as unknown as Prisma.InputJsonValue,
          passingScore: policy.passingScore,
          createdAt: policy.createdAt,
          updatedAt: policy.updatedAt,
        },
      });
      return Result.ok(undefined);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return Result.err({ kind: "db_error", message: msg });
    }
  }

  async update(policy: ScorePolicy): Promise<Result<void, SimulatorAttemptError>> {
    try {
      await this.prisma.scorePolicy.update({
        where: {
          simulatorId_difficulty_mode: {
            simulatorId: policy.simulatorId,
            difficulty: policy.difficulty,
            mode: policy.mode,
          },
        },
        data: {
          dimensionConfig: policy.dimensionConfig as unknown as Prisma.InputJsonValue,
          passingScore: policy.passingScore,
          updatedAt: policy.updatedAt,
        },
      });
      return Result.ok(undefined);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return Result.err({ kind: "db_error", message: msg });
    }
  }
}

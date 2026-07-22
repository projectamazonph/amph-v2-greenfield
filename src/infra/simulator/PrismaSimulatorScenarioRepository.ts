/**
 * PrismaSimulatorScenarioRepository, production Prisma adapter.
 *
 * STORY-050b / P0-2 follow-up: no Prisma model existed for
 * SimulatorScenario, so buildProductionContainer() fell back to
 * InMemorySimulatorScenarioRepository: every admin-created practice
 * scenario vanished on cold start / redeploy. Migration
 * 20260722030000_simulator_scenario adds the table.
 *
 * "Archiving" a scenario is a soft-delete via the nullable archivedAt
 * column, matching InMemorySimulatorScenarioRepository's existing
 * contract; there is no hard delete.
 *
 * mapRow() reuses createSimulatorScenario() (the domain factory) to
 * validate a persisted row instead of duplicating its
 * simulatorId/difficulty checks: a corrupt or legacy row throws, which
 * every caller's try/catch turns into db_error.
 */

import { PrismaClient, Prisma } from "@prisma/client";
import { Result } from "@/domain/shared/Result";
import { createSimulatorScenario } from "@/domain/entities/SimulatorScenario";
import type { SimulatorScenario } from "@/domain/entities/SimulatorScenario";
import type {
  ISimulatorScenarioRepository,
  SimulatorScenarioError,
  ListScenariosFilter,
} from "@/ports/repositories/ISimulatorScenarioRepository";

interface SimulatorScenarioRow {
  id: string;
  simulatorId: string;
  name: string;
  description: string;
  inputSchema: Prisma.JsonValue;
  outputSchema: Prisma.JsonValue;
  difficulty: string;
  estimatedMinutes: number;
}

export class PrismaSimulatorScenarioRepository implements ISimulatorScenarioRepository {
  constructor(private readonly db: PrismaClient) {}

  async listAll(
    filter?: ListScenariosFilter,
  ): Promise<Result<SimulatorScenario[], SimulatorScenarioError>> {
    try {
      const rows = await this.db.simulatorScenario.findMany({
        where: {
          archivedAt: null,
          ...(filter?.simulatorId ? { simulatorId: filter.simulatorId } : {}),
        },
      });
      return Result.ok(rows.map((r) => this.mapRow(r)));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async findById(id: string): Promise<Result<SimulatorScenario | null, SimulatorScenarioError>> {
    try {
      const row = await this.db.simulatorScenario.findUnique({ where: { id } });
      if (!row || row.archivedAt !== null) return Result.ok(null);
      return Result.ok(this.mapRow(row));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async create(
    scenario: SimulatorScenario,
  ): Promise<Result<SimulatorScenario, SimulatorScenarioError>> {
    try {
      const row = await this.db.simulatorScenario.create({
        data: {
          id: scenario.id,
          simulatorId: scenario.simulatorId,
          name: scenario.name,
          description: scenario.description,
          inputSchema: scenario.inputSchema as Prisma.InputJsonValue,
          outputSchema: scenario.outputSchema as Prisma.InputJsonValue,
          difficulty: scenario.difficulty,
          estimatedMinutes: scenario.estimatedMinutes,
        },
      });
      return Result.ok(this.mapRow(row));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async update(
    scenario: SimulatorScenario,
  ): Promise<Result<SimulatorScenario, SimulatorScenarioError>> {
    try {
      const row = await this.db.simulatorScenario.update({
        where: { id: scenario.id },
        data: {
          simulatorId: scenario.simulatorId,
          name: scenario.name,
          description: scenario.description,
          inputSchema: scenario.inputSchema as Prisma.InputJsonValue,
          outputSchema: scenario.outputSchema as Prisma.InputJsonValue,
          difficulty: scenario.difficulty,
          estimatedMinutes: scenario.estimatedMinutes,
        },
      });
      return Result.ok(this.mapRow(row));
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

  async archive(id: string): Promise<Result<void, SimulatorScenarioError>> {
    try {
      await this.db.simulatorScenario.update({
        where: { id },
        data: { archivedAt: new Date() },
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

  private mapRow(row: SimulatorScenarioRow): SimulatorScenario {
    const result = createSimulatorScenario({
      id: row.id,
      simulatorId: row.simulatorId,
      name: row.name,
      description: row.description,
      inputSchema: row.inputSchema as Record<string, unknown>,
      outputSchema: row.outputSchema as Record<string, unknown>,
      difficulty: row.difficulty,
      estimatedMinutes: row.estimatedMinutes,
    });
    if (!result.ok) {
      // Caught by the surrounding try/catch in every caller and turned
      // into a db_error. A corrupt or legacy row must not silently
      // hydrate an invalid SimulatorScenario.
      throw new Error(
        `SimulatorScenario ${row.id} failed validation on read: ${result.error.kind}`,
      );
    }
    return result.value;
  }
}

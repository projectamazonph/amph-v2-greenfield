/**
 * PrismaMaintenanceRepository - P1-08 maintenance mode.
 */

import { PrismaClient } from "@prisma/client";
import { Result } from "@/domain/shared/Result";
import type { MaintenanceRepository, MaintenanceError } from "@/ports/repositories/LMS/MaintenanceRepository";
import type { Maintenance } from "@/domain/entities/LMS/Maintenance";

export class PrismaMaintenanceRepository implements MaintenanceRepository {
  constructor(private readonly db: PrismaClient) {}

  async getActive(): Promise<Result<Maintenance | null, MaintenanceError>> {
    try {
      const row = await this.db.maintenance.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
      });
      if (!row) return Result.ok(null);
      return Result.ok(this.mapRow(row));
    } catch (err) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async findById(id: string): Promise<Result<Maintenance, MaintenanceError>> {
    try {
      const row = await this.db.maintenance.findUnique({ where: { id } });
      if (!row) return Result.err({ kind: "not_found" });
      return Result.ok(this.mapRow(row));
    } catch (err) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async listAll(): Promise<Result<readonly Maintenance[], MaintenanceError>> {
    try {
      const rows = await this.db.maintenance.findMany({
        orderBy: { createdAt: "desc" },
      });
      return Result.ok(rows.map((r) => this.mapRow(r)));
    } catch (err) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async create(params: {
    isActive: boolean;
    message?: string | null;
    startAt?: Date | null;
    endAt?: Date | null;
    createdById?: string | null;
  }): Promise<Result<Maintenance, MaintenanceError>> {
    try {
      const row = await this.db.maintenance.create({
        data: {
          isActive: params.isActive,
          message: params.message ?? null,
          startAt: params.startAt ?? null,
          endAt: params.endAt ?? null,
          createdById: params.createdById ?? null,
        },
      });
      return Result.ok(this.mapRow(row));
    } catch (err) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async update(
    id: string,
    patch: Partial<{
      isActive: boolean;
      message: string | null;
      startAt: Date | null;
      endAt: Date | null;
    }>,
  ): Promise<Result<Maintenance, MaintenanceError>> {
    try {
      const row = await this.db.maintenance.update({
        where: { id },
        data: { ...patch },
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

  async delete(id: string): Promise<Result<void, MaintenanceError>> {
    try {
      await this.db.maintenance.delete({ where: { id } });
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

  private mapRow(row: {
    id: string;
    isActive: boolean;
    message: string | null;
    startAt: Date | null;
    endAt: Date | null;
    createdById: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): Maintenance {
    return Object.freeze({
      id: row.id,
      isActive: row.isActive,
      message: row.message,
      startAt: row.startAt,
      endAt: row.endAt,
      createdById: row.createdById,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}

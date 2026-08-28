/**
 * InMemoryMaintenanceRepository - fake for tests.
 */

import type { MaintenanceRepository, MaintenanceError } from "@/ports/repositories/LMS/MaintenanceRepository";
import type { Maintenance } from "@/domain/entities/LMS/Maintenance";
import { Result } from "@/domain/shared/Result";

export class InMemoryMaintenanceRepository implements MaintenanceRepository {
  private maintenanceWindows = new Map<string, Maintenance>();

  async getActive(): Promise<Result<Maintenance | null, MaintenanceError>> {
    for (const m of this.maintenanceWindows.values()) {
      if (m.isActive) return Result.ok(m);
    }
    return Result.ok(null);
  }

  async findById(id: string): Promise<Result<Maintenance, MaintenanceError>> {
    const m = this.maintenanceWindows.get(id);
    if (!m) return Result.err({ kind: "not_found" });
    return Result.ok(m);
  }

  async listAll(): Promise<Result<readonly Maintenance[], MaintenanceError>> {
    return Result.ok(Array.from(this.maintenanceWindows.values()));
  }

  async create(params: {
    isActive: boolean;
    message?: string | null;
    startAt?: Date | null;
    endAt?: Date | null;
    createdById?: string | null;
  }): Promise<Result<Maintenance, MaintenanceError>> {
    const id = `m-${Date.now()}`;
    const m: Maintenance = Object.freeze({
      id,
      isActive: params.isActive,
      message: params.message ?? null,
      startAt: params.startAt ?? null,
      endAt: params.endAt ?? null,
      createdById: params.createdById ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    this.maintenanceWindows.set(id, m);
    return Result.ok(m);
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
    const existing = this.maintenanceWindows.get(id);
    if (!existing) return Result.err({ kind: "not_found" });
    const updated: Maintenance = Object.freeze({ ...existing, ...patch, updatedAt: new Date() });
    this.maintenanceWindows.set(id, updated);
    return Result.ok(updated);
  }

  async delete(id: string): Promise<Result<void, MaintenanceError>> {
    if (!this.maintenanceWindows.has(id)) return Result.err({ kind: "not_found" });
    this.maintenanceWindows.delete(id);
    return Result.ok(undefined);
  }

  clear(): void {
    this.maintenanceWindows.clear();
  }
}

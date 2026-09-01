/**
 * MaintenanceRepository port for P1-08 maintenance mode.
 */

import type { Maintenance } from "@/domain/entities/LMS/Maintenance";
import { Result } from "@/domain/shared/Result";

export type MaintenanceError =
  { kind: "not_found" } | { kind: "db_error"; message: string };

export interface MaintenanceRepository {
  /**
   * Get the current active maintenance window, if any.
   */
  getActive(): Promise<Result<Maintenance | null, MaintenanceError>>;

  /**
   * Get maintenance by ID.
   */
  findById(id: string): Promise<Result<Maintenance, MaintenanceError>>;

  /**
   * List all maintenance windows.
   */
  listAll(): Promise<Result<readonly Maintenance[], MaintenanceError>>;

  /**
   * Create a new maintenance window.
   */
  create(params: {
    isActive: boolean;
    message?: string | null;
    startAt?: Date | null;
    endAt?: Date | null;
    createdById?: string | null;
  }): Promise<Result<Maintenance, MaintenanceError>>;

  /**
   * Update a maintenance window.
   */
  update(
    id: string,
    patch: Partial<{
      isActive: boolean;
      message: string | null;
      startAt: Date | null;
      endAt: Date | null;
    }>,
  ): Promise<Result<Maintenance, MaintenanceError>>;

  /**
   * Delete a maintenance window.
   */
  delete(id: string): Promise<Result<void, MaintenanceError>>;
}

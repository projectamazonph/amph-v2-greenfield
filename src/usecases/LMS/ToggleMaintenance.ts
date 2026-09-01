/**
 * ToggleMaintenance use case - enable/disable maintenance mode.
 * P1-08: Maintenance mode / kill switch.
 */

import { Result } from "@/domain/shared/Result";
import type { MaintenanceRepository, MaintenanceError } from "@/ports/repositories/LMS/MaintenanceRepository";
import type { Maintenance } from "@/domain/entities/LMS/Maintenance";

export interface ToggleMaintenanceInput {
  isActive: boolean;
  message?: string | null;
}

export class ToggleMaintenance {
  constructor(private readonly maintenanceRepo: MaintenanceRepository) {}

  async execute(input: ToggleMaintenanceInput): Promise<Result<Maintenance, MaintenanceError>> {
    const existingResult = await this.maintenanceRepo.getActive();
    if (existingResult.ok && existingResult.value) {
      // Update existing
      return this.maintenanceRepo.update(existingResult.value.id, {
        isActive: input.isActive,
        message: input.message,
      });
    }
    // Create new
    return this.maintenanceRepo.create({
      isActive: input.isActive,
      message: input.message,
    });
  }
}

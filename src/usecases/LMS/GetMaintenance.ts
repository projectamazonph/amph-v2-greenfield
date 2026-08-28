/**
 * GetMaintenance use case - retrieve current maintenance status.
 * P1-08: Maintenance mode / kill switch.
 */

import { Result } from "@/domain/shared/Result";
import type { MaintenanceRepository, MaintenanceError } from "@/ports/repositories/LMS/MaintenanceRepository";
import type { Maintenance } from "@/domain/entities/LMS/Maintenance";

export class GetMaintenance {
  constructor(private readonly maintenanceRepo: MaintenanceRepository) {}

  async execute(): Promise<Result<Maintenance | null, MaintenanceError>> {
    return this.maintenanceRepo.getActive();
  }
}

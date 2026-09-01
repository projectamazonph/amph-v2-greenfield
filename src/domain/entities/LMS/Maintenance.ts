/**
 * Maintenance entity for P1-08 maintenance mode / kill switch.
 */

export interface Maintenance {
  readonly id: string;
  readonly isActive: boolean;
  readonly message: string | null;
  readonly startAt: Date | null;
  readonly endAt: Date | null;
  readonly createdById: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateMaintenanceParams {
  isActive: boolean;
  message?: string | null;
  startAt?: Date | null;
  endAt?: Date | null;
  createdById?: string | null;
}

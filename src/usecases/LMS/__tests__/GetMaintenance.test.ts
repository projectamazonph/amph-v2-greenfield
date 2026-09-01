/**
 * Unit tests for GetMaintenance use case.
 * P1-08: Maintenance mode / kill switch.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { GetMaintenance } from "@/usecases/LMS/GetMaintenance";
import { InMemoryMaintenanceRepository } from "@/infra/repositories/LMS/InMemoryMaintenanceRepository";
import { Maintenance } from "@/domain/entities/LMS/Maintenance";

describe("GetMaintenance", () => {
  let repo: InMemoryMaintenanceRepository;
  let useCase: GetMaintenance;

  beforeEach(() => {
    repo = new InMemoryMaintenanceRepository();
    useCase = new GetMaintenance(repo);
  });

  it("should return null when no active maintenance exists", async () => {
    const result = await useCase.execute();
    expect(result.ok).toBe(true);
    expect(result.value).toBeNull();
  });

  it("should return active maintenance when it exists", async () => {
    const maintenance: Maintenance = {
      id: "maint_1",
      isActive: true,
      message: "System under maintenance",
      startAt: null,
      endAt: null,
      createdById: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await repo.create(maintenance);

    const result = await useCase.execute();
    expect(result.ok).toBe(true);
    expect(result.value).toEqual(maintenance);
  });

  it("should return null when only inactive maintenance exists", async () => {
    const inactive: Maintenance = {
      id: "maint_1",
      isActive: false,
      message: "Previous maintenance",
      startAt: null,
      endAt: null,
      createdById: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await repo.create(inactive);

    const result = await useCase.execute();
    expect(result.ok).toBe(true);
    expect(result.value).toBeNull();
  });
});

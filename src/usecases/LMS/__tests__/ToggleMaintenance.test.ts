/**
 * Unit tests for ToggleMaintenance use case.
 * P1-08: Maintenance mode / kill switch.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ToggleMaintenance } from "@/usecases/LMS/ToggleMaintenance";
import { InMemoryMaintenanceRepository } from "@/infra/repositories/LMS/InMemoryMaintenanceRepository";
import type { ToggleMaintenanceInput } from "@/usecases/LMS/ToggleMaintenance";

describe("ToggleMaintenance", () => {
  let repo: InMemoryMaintenanceRepository;
  let useCase: ToggleMaintenance;

  beforeEach(() => {
    repo = new InMemoryMaintenanceRepository();
    useCase = new ToggleMaintenance(repo);
  });

  it("should create new maintenance when none exists", async () => {
    const input: ToggleMaintenanceInput = {
      isActive: true,
      message: "Emergency maintenance",
    };

    const result = await useCase.execute(input);
    expect(result.ok).toBe(true);
    expect(result.value.isActive).toBe(true);
    expect(result.value.message).toBe("Emergency maintenance");
  });

  it("should update existing maintenance when one exists", async () => {
    await repo.create({
      id: "maint_1",
      isActive: false,
      message: "Old message",
      startAt: null,
      endAt: null,
      createdById: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const input: ToggleMaintenanceInput = {
      isActive: true,
      message: "New message",
    };

    const result = await useCase.execute(input);
    expect(result.ok).toBe(true);
    expect(result.value.isActive).toBe(true);
    expect(result.value.message).toBe("New message");
    expect(result.value.id).toBe("maint_1");
  });

  it("should deactivate maintenance when toggling off", async () => {
    await repo.create({
      id: "maint_1",
      isActive: true,
      message: "Active maintenance",
      startAt: null,
      endAt: null,
      createdById: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const input: ToggleMaintenanceInput = {
      isActive: false,
      message: null,
    };

    const result = await useCase.execute(input);
    expect(result.ok).toBe(true);
    expect(result.value.isActive).toBe(false);
    expect(result.value.message).toBeNull();
  });
});

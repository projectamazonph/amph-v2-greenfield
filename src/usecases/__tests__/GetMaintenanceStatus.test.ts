/**
 * Use case tests for GetMaintenanceStatus — P1-08 (P4 PR-A).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { GetMaintenanceStatus, toView } from "../GetMaintenanceStatus";
import { InMemoryMaintenanceSettingRepository } from "@/infra/repositories/inmemory/InMemoryMaintenanceSettingRepository";
import { createMaintenanceSetting } from "@/domain/entities/MaintenanceSetting";

const T0 = new Date("2026-03-01T08:00:00.000Z");

function seed(repo: InMemoryMaintenanceSettingRepository, opts: { enabled: boolean; message?: string | null; allowedAdminIds?: readonly string[] }) {
  const r = createMaintenanceSetting({
    id: "current",
    enabled: opts.enabled,
    message: opts.message ?? null,
    allowedAdminIds: opts.allowedAdminIds ?? [],
    updatedById: "admin_alice",
    updatedAt: T0,
  });
  if (!r.ok) throw new Error("seed failed");
  repo.seed(r.value);
}

describe("GetMaintenanceStatus", () => {
  let repo: InMemoryMaintenanceSettingRepository;
  let useCase: GetMaintenanceStatus;

  beforeEach(() => {
    repo = new InMemoryMaintenanceSettingRepository();
    useCase = new GetMaintenanceStatus({ maintenanceRepo: repo });
  });

  it("returns a safe default view when no row exists", async () => {
    const r = await useCase.execute();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toEqual({
      enabled: false,
      message: null,
      allowedAdminIds: [],
      updatedAt: null,
      updatedById: null,
    });
  });

  it("reflects the stored row when present", async () => {
    seed(repo, { enabled: true, message: "Going down", allowedAdminIds: ["admin_alice"] });
    const r = await useCase.execute();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.enabled).toBe(true);
    expect(r.value.message).toBe("Going down");
    expect(r.value.allowedAdminIds).toEqual(["admin_alice"]);
    expect(r.value.updatedAt).toEqual(T0);
    expect(r.value.updatedById).toBe("admin_alice");
  });

  it("propagates DB errors from the repo", async () => {
    const broken = new InMemoryMaintenanceSettingRepository();
    broken.getCurrent = async () => ({ ok: false, error: { kind: "db_error", message: "boom" } });
    const uc = new GetMaintenanceStatus({ maintenanceRepo: broken });
    const r = await uc.execute();
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
  });

  it("executeSafe returns the supplied fallback when the repo errors", async () => {
    const broken = new InMemoryMaintenanceSettingRepository();
    broken.getCurrent = async () => ({ ok: false, error: { kind: "db_error", message: "boom" } });
    const uc = new GetMaintenanceStatus({ maintenanceRepo: broken });
    const fallback = toView(null);
    const view = await uc.executeSafe(fallback);
    expect(view).toEqual(fallback);
    expect(view.enabled).toBe(false);
  });

  it("executeSafe returns the live view on success", async () => {
    seed(repo, { enabled: true, message: "Live" });
    const view = await useCase.executeSafe(toView(null));
    expect(view.enabled).toBe(true);
    expect(view.message).toBe("Live");
  });
});

describe("toView", () => {
  it("returns the safe default for null", () => {
    expect(toView(null).enabled).toBe(false);
    expect(toView(null).message).toBeNull();
    expect(toView(null).allowedAdminIds).toEqual([]);
  });

  it("copies a non-null setting verbatim", () => {
    const r = createMaintenanceSetting({
      id: "current",
      enabled: true,
      message: "hi",
      updatedById: "admin_alice",
      updatedAt: T0,
    });
    if (!r.ok) throw new Error("seed failed");
    const view = toView(r.value);
    expect(view.enabled).toBe(true);
    expect(view.message).toBe("hi");
    expect(view.updatedById).toBe("admin_alice");
    expect(view.updatedAt).toEqual(T0);
  });
});
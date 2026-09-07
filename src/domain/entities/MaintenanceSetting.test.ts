/**
 * Domain tests for MaintenanceSetting — P1-08 (P4 PR-A).
 *
 * 100% branch coverage target (per AGENTS.md: domain functions are
 * pure and must be exhaustively tested).
 */

import { describe, it, expect } from "vitest";
import {
  createMaintenanceSetting,
  toggleMaintenanceSetting,
  isAdminAllowed,
  getMaintenanceMessage,
  type MaintenanceSetting,
} from "./MaintenanceSetting";

const FIXED_DATE = new Date("2026-01-15T08:00:00.000Z");

function seed(): MaintenanceSetting {
  const r = createMaintenanceSetting({
    id: "current",
    enabled: false,
    message: null,
    allowedAdminIds: ["admin_alice", "admin_bob"],
    updatedById: "admin_alice",
    updatedAt: FIXED_DATE,
  });
  if (!r.ok) throw new Error(`seed failed: ${JSON.stringify(r.error)}`);
  return r.value;
}

describe("createMaintenanceSetting", () => {
  it("returns a frozen entity for the happy path", () => {
    const r = createMaintenanceSetting({
      id: "current",
      enabled: true,
      message: "We are upgrading the database.",
      allowedAdminIds: ["admin_alice"],
      updatedById: "admin_alice",
      updatedAt: FIXED_DATE,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toEqual({
      id: "current",
      enabled: true,
      message: "We are upgrading the database.",
      allowedAdminIds: ["admin_alice"],
      updatedAt: FIXED_DATE,
      updatedById: "admin_alice",
    });
    expect(Object.isFrozen(r.value)).toBe(true);
    expect(Object.isFrozen(r.value.allowedAdminIds)).toBe(true);
  });

  it("defaults message to null and allowedAdminIds to empty", () => {
    const r = createMaintenanceSetting({
      id: "current",
      enabled: false,
      updatedById: "admin_alice",
      updatedAt: FIXED_DATE,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.message).toBeNull();
    expect(r.value.allowedAdminIds).toEqual([]);
  });

  it("defaults updatedAt to a fresh Date when omitted", () => {
    const before = Date.now();
    const r = createMaintenanceSetting({
      id: "current",
      enabled: false,
      updatedById: "admin_alice",
    });
    const after = Date.now();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.updatedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(r.value.updatedAt.getTime()).toBeLessThanOrEqual(after);
  });

  it("treats empty / whitespace-only message as null", () => {
    const r = createMaintenanceSetting({
      id: "current",
      enabled: false,
      message: "   ",
      updatedById: "admin_alice",
      updatedAt: FIXED_DATE,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.message).toBeNull();
  });

  it("rejects malformed id", () => {
    const r = createMaintenanceSetting({
      id: "x".repeat(200),
      enabled: false,
      updatedById: "admin_alice",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("invalid_input");
  });

  it("rejects empty updatedById", () => {
    const r = createMaintenanceSetting({
      id: "current",
      enabled: false,
      updatedById: "",
    });
    expect(r.ok).toBe(false);
  });

  it("rejects message over the length cap", () => {
    const r = createMaintenanceSetting({
      id: "current",
      enabled: false,
      message: "x".repeat(501),
      updatedById: "admin_alice",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("invalid_input");
  });

  it("rejects more than 50 allowed admin ids", () => {
    const tooMany = Array.from({ length: 51 }, (_, i) => `admin_${i}`);
    const r = createMaintenanceSetting({
      id: "current",
      enabled: false,
      allowedAdminIds: tooMany,
      updatedById: "admin_alice",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("invalid_input");
  });

  it("rejects malformed admin id inside allowedAdminIds", () => {
    const r = createMaintenanceSetting({
      id: "current",
      enabled: false,
      allowedAdminIds: ["valid_id", "x".repeat(200)],
      updatedById: "admin_alice",
    });
    expect(r.ok).toBe(false);
  });

  it("de-duplicates allowed admin ids", () => {
    const r = createMaintenanceSetting({
      id: "current",
      enabled: false,
      allowedAdminIds: ["admin_alice", "admin_alice", "admin_bob"],
      updatedById: "admin_alice",
      updatedAt: FIXED_DATE,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.allowedAdminIds).toEqual(["admin_alice", "admin_bob"]);
  });
});

describe("toggleMaintenanceSetting", () => {
  it("flips enabled and rewrites updatedById + updatedAt", () => {
    const current = seed();
    const later = new Date("2026-02-01T12:00:00.000Z");
    const r = toggleMaintenanceSetting(current, {
      enabled: true,
      message: "Going down for upgrade",
      allowedAdminIds: ["admin_alice"],
      updatedById: "admin_carol",
      updatedAt: later,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.enabled).toBe(true);
    expect(r.value.message).toBe("Going down for upgrade");
    expect(r.value.allowedAdminIds).toEqual(["admin_alice"]);
    expect(r.value.updatedById).toBe("admin_carol");
    expect(r.value.updatedAt).toEqual(later);
    // id is preserved across toggles
    expect(r.value.id).toBe(current.id);
  });

  it("leaves message alone when patch.message is undefined", () => {
    const current = seed();
    const r = toggleMaintenanceSetting(current, {
      enabled: true,
      updatedById: "admin_alice",
      updatedAt: FIXED_DATE,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.message).toBe(current.message);
  });

  it("clears message when patch.message is null", () => {
    const current = seed();
    const r = toggleMaintenanceSetting(current, {
      enabled: true,
      message: null,
      updatedById: "admin_alice",
      updatedAt: FIXED_DATE,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.message).toBeNull();
  });

  it("leaves allowedAdminIds alone when patch omits it", () => {
    const current = seed();
    const r = toggleMaintenanceSetting(current, {
      enabled: true,
      updatedById: "admin_alice",
      updatedAt: FIXED_DATE,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.allowedAdminIds).toEqual(current.allowedAdminIds);
  });

  it("rejects malformed updatedById", () => {
    const current = seed();
    const r = toggleMaintenanceSetting(current, {
      enabled: true,
      updatedById: "",
    });
    expect(r.ok).toBe(false);
  });

  it("rejects too-long message in the patch", () => {
    const current = seed();
    const r = toggleMaintenanceSetting(current, {
      enabled: true,
      message: "x".repeat(501),
      updatedById: "admin_alice",
    });
    expect(r.ok).toBe(false);
  });

  it("treats empty patched message as null (normalisation)", () => {
    const current = seed();
    const r = toggleMaintenanceSetting(current, {
      enabled: true,
      message: "   ",
      updatedById: "admin_alice",
      updatedAt: FIXED_DATE,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.message).toBeNull();
  });
});

describe("isAdminAllowed", () => {
  it("returns true for an allowed admin id", () => {
    const current = seed();
    expect(isAdminAllowed(current, "admin_alice")).toBe(true);
    expect(isAdminAllowed(current, "admin_bob")).toBe(true);
  });

  it("returns false for an unlisted id", () => {
    const current = seed();
    expect(isAdminAllowed(current, "admin_eve")).toBe(false);
  });

  it("returns false when allowedAdminIds is empty", () => {
    const r = createMaintenanceSetting({
      id: "current",
      enabled: true,
      updatedById: "admin_alice",
      updatedAt: FIXED_DATE,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(isAdminAllowed(r.value, "admin_alice")).toBe(false);
  });
});

describe("getMaintenanceMessage", () => {
  it("returns the entity's message", () => {
    const current = seed();
    expect(getMaintenanceMessage(current)).toBeNull();
  });

  it("returns the configured message when present", () => {
    const r = createMaintenanceSetting({
      id: "current",
      enabled: true,
      message: "Maintenance in progress",
      updatedById: "admin_alice",
      updatedAt: FIXED_DATE,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(getMaintenanceMessage(r.value)).toBe("Maintenance in progress");
  });
});
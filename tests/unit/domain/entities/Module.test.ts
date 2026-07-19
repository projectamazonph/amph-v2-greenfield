/**
 * Module entity tests — Rule 8 (TDD compliance).
 *
 * Tests createModule factory invariants and updateModule patch logic.
 */

import { describe, it, expect } from "vitest";
import { createModule, updateModule, type Module } from "@/domain/entities/Module";

function makeModule(overrides: Partial<Parameters<typeof createModule>[0]> = {}): Module {
  const r = createModule({
    id: "m-1",
    courseId: "c-1",
    title: "Introduction",
    displayOrder: 1,
    ...overrides,
  });
  if (!r.ok) throw new Error(`setup failed: ${r.error.message}`);
  return r.value;
}

describe("Module entity", () => {
  describe("createModule", () => {
    it("creates a module with valid params", () => {
      const r = createModule({
        id: "m-1",
        courseId: "c-1",
        title: "Introduction",
        displayOrder: 1,
      });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.value.title).toBe("Introduction");
      expect(r.value.displayOrder).toBe(1);
      expect(r.value.id).toBe("m-1");
      expect(r.value.courseId).toBe("c-1");
    });

    it("rejects empty id", () => {
      const r = createModule({
        id: "  ",
        courseId: "c-1",
        title: "T",
        displayOrder: 1,
      });
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.message).toMatch(/id/i);
    });

    it("rejects empty courseId", () => {
      const r = createModule({
        id: "m-1",
        courseId: "",
        title: "T",
        displayOrder: 1,
      });
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.message).toMatch(/course id/i);
    });

    it("rejects empty title", () => {
      const r = createModule({
        id: "m-1",
        courseId: "c-1",
        title: "   ",
        displayOrder: 1,
      });
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.message).toMatch(/title/i);
    });

    it("rejects non-positive displayOrder", () => {
      expect(
        createModule({ id: "m-1", courseId: "c-1", title: "T", displayOrder: 0 }).ok,
      ).toBe(false);
      expect(
        createModule({ id: "m-1", courseId: "c-1", title: "T", displayOrder: -1 }).ok,
      ).toBe(false);
      expect(
        createModule({ id: "m-1", courseId: "c-1", title: "T", displayOrder: 1.5 }).ok,
      ).toBe(false);
    });

    it("trims id, courseId, and title", () => {
      const r = createModule({
        id: "  m-1  ",
        courseId: "  c-1  ",
        title: "  Hello  ",
        displayOrder: 1,
      });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.value.id).toBe("m-1");
      expect(r.value.courseId).toBe("c-1");
      expect(r.value.title).toBe("Hello");
    });
  });

  describe("updateModule", () => {
    it("applies a title patch", () => {
      const original = makeModule();
      const r = updateModule(original, { title: "New Title" });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.value.title).toBe("New Title");
      expect(r.value.id).toBe(original.id);
      expect(r.value.courseId).toBe(original.courseId);
    });

    it("applies a displayOrder patch", () => {
      const original = makeModule({ displayOrder: 1 });
      const r = updateModule(original, { displayOrder: 5 });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.value.displayOrder).toBe(5);
    });

    it("validates the patched result (rejects empty title)", () => {
      const original = makeModule();
      const r = updateModule(original, { title: "  " });
      expect(r.ok).toBe(false);
    });

    it("bumps updatedAt", () => {
      const original = makeModule({
        createdAt: new Date("2026-01-01T00:00:00Z"),
        updatedAt: new Date("2026-01-01T00:00:00Z"),
      });
      const r = updateModule(original, { title: "Bumped" });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.value.updatedAt.getTime()).toBeGreaterThan(original.updatedAt.getTime());
      expect(r.value.createdAt).toEqual(original.createdAt);
    });
  });
});

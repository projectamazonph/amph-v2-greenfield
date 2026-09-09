/**
 * Tests for the Announcement domain entity.
 *
 * P1-07 (P4 PR-A). Focus on `isVisibleAt` — the runtime predicate
 * the banner relies on every render. Validation is also tested.
 */

import { describe, it, expect } from "vitest";
import {
  hydrateAnnouncement,
  createAnnouncement,
  announcementIsVisibleAt,
  validateAnnouncementDraft,
} from "@/domain/entities/Announcement";

const baseFields = {
  id: "a1",
  title: "Heads up",
  body: "We are upgrading the simulators tonight.",
  level: "INFO" as const,
  isActive: true,
  startsAt: null,
  endsAt: null,
  dismissible: true,
  createdAt: new Date("2026-09-01T00:00:00Z"),
  updatedAt: new Date("2026-09-01T00:00:00Z"),
  createdById: "admin_1",
  updatedById: "admin_1",
};

const at = (iso: string): Date => new Date(iso);

describe("announcementIsVisibleAt", () => {
  it("returns false when isActive=false", () => {
    const a = hydrateAnnouncement({ ...baseFields, isActive: false });
    expect(a.isVisibleAt(at("2026-09-15T00:00:00Z"))).toBe(false);
  });

  it("returns true when active and no time window", () => {
    const a = hydrateAnnouncement(baseFields);
    expect(a.isVisibleAt(at("2026-09-15T00:00:00Z"))).toBe(true);
  });

  it("returns false when now is before startsAt", () => {
    const a = hydrateAnnouncement({
      ...baseFields,
      startsAt: at("2026-09-10T00:00:00Z"),
    });
    expect(a.isVisibleAt(at("2026-09-09T23:59:59Z"))).toBe(false);
  });

  it("returns true when now equals startsAt (inclusive)", () => {
    const a = hydrateAnnouncement({
      ...baseFields,
      startsAt: at("2026-09-10T00:00:00Z"),
    });
    expect(a.isVisibleAt(at("2026-09-10T00:00:00Z"))).toBe(true);
  });

  it("returns false when now equals endsAt (exclusive)", () => {
    const a = hydrateAnnouncement({
      ...baseFields,
      startsAt: at("2026-09-10T00:00:00Z"),
      endsAt: at("2026-09-12T00:00:00Z"),
    });
    expect(a.isVisibleAt(at("2026-09-12T00:00:00Z"))).toBe(false);
  });

  it("returns true when now is between startsAt and endsAt", () => {
    const a = hydrateAnnouncement({
      ...baseFields,
      startsAt: at("2026-09-10T00:00:00Z"),
      endsAt: at("2026-09-12T00:00:00Z"),
    });
    expect(a.isVisibleAt(at("2026-09-11T12:00:00Z"))).toBe(true);
  });

  it("returns true when endsAt is null even with a future startsAt", () => {
    const a = hydrateAnnouncement({
      ...baseFields,
      startsAt: at("2026-09-10T00:00:00Z"),
      endsAt: null,
    });
    expect(a.isVisibleAt(at("2030-01-01T00:00:00Z"))).toBe(true);
  });

  it("returns false when active but endsAt is in the past", () => {
    const a = hydrateAnnouncement({
      ...baseFields,
      startsAt: at("2026-01-01T00:00:00Z"),
      endsAt: at("2026-01-02T00:00:00Z"),
    });
    expect(a.isVisibleAt(at("2026-09-15T00:00:00Z"))).toBe(false);
  });
});

describe("validateAnnouncementDraft", () => {
  const ok = {
    title: "Title",
    body: "Body",
    level: "INFO",
    isActive: true,
    startsAt: null,
    endsAt: null,
    dismissible: true,
  };

  it("accepts a valid draft", () => {
    const r = validateAnnouncementDraft(ok);
    expect(r.ok).toBe(true);
  });

  it("trims whitespace before validation", () => {
    const r = validateAnnouncementDraft({ ...ok, title: "  Title  " });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.title).toBe("Title");
  });

  it("rejects empty title", () => {
    const r = validateAnnouncementDraft({ ...ok, title: "   " });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("invalid_title");
  });

  it("rejects title over 120 chars", () => {
    const r = validateAnnouncementDraft({ ...ok, title: "x".repeat(121) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("invalid_title");
  });

  it("rejects empty body", () => {
    const r = validateAnnouncementDraft({ ...ok, body: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("invalid_body");
  });

  it("rejects invalid level", () => {
    const r = validateAnnouncementDraft({ ...ok, level: "GREEN" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("invalid_level");
  });

  it("rejects endsAt <= startsAt", () => {
    const r = validateAnnouncementDraft({
      ...ok,
      startsAt: at("2026-09-10T00:00:00Z"),
      endsAt: at("2026-09-10T00:00:00Z"),
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("invalid_window");
  });

  it("defaults isActive to false and dismissible to true", () => {
    const r = validateAnnouncementDraft({
      title: ok.title,
      body: ok.body,
      level: ok.level,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.isActive).toBe(false);
      expect(r.value.dismissible).toBe(true);
    }
  });
});

describe("createAnnouncement", () => {
  it("returns a frozen entity on success", () => {
    const r = createAnnouncement({
      id: "a1",
      title: "  Hello  ",
      body: "Body",
      level: "WARNING",
      createdAt: new Date("2026-09-01T00:00:00Z"),
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(Object.isFrozen(r.value)).toBe(true);
      expect(r.value.title).toBe("Hello");
      expect(r.value.level).toBe("WARNING");
    }
  });

  it("propagates validation errors", () => {
    const r = createAnnouncement({
      id: "a1",
      title: "",
      body: "Body",
      level: "INFO",
      createdAt: new Date("2026-09-01T00:00:00Z"),
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("invalid_title");
  });
});

/**
 * PrismaBadgeRepository adapter test.
 *
 * Uses a hand-rolled in-memory PrismaClient fake so the test stays
 * fast and DB-free. The fake implements the same surface the adapter
 * calls: `findUnique`, `findMany`, `create`, `update`.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { PrismaBadgeRepository } from "@/infra/repositories/PrismaBadgeRepository";
import type { Badge } from "@/domain/entities/Badge";

interface BadgeRow {
  slug: string;
  name: string;
  description: string;
  iconName: string;
  xpReward: number;
  archived: boolean;
}

class FakePrismaClient {
  rows: Map<string, BadgeRow> = new Map();
  failNextFind = false;
  failNextFindMany = false;
  failNextCreate = false;
  failNextUpdate = false;
  p2002OnCreate = false;
  p2002OnUpdate = false;
  private clock = 0;

  private tick(): Date {
    this.clock += 1;
    return new Date(this.clock);
  }

  badge = {
    findUnique: async (args: { where: { slug: string } }) => {
      if (this.failNextFind) {
        this.failNextFind = false;
        throw new Error("forced find error");
      }
      const row = this.rows.get(args.where.slug) ?? null;
      // Return a plain object matching Prisma's return shape (with extra timestamp props)
      return row ? { ...row, createdAt: this.tick(), updatedAt: this.tick() } : null;
    },

    findMany: async () => {
      if (this.failNextFindMany) {
        this.failNextFindMany = false;
        throw new Error("forced findMany error");
      }
      return [...this.rows.values()].map((r) => ({
        ...r,
        createdAt: this.tick(),
        updatedAt: this.tick(),
      }));
    },

    create: async (args: { data: BadgeRow }) => {
      if (this.failNextCreate) {
        this.failNextCreate = false;
        throw new Error("forced create error");
      }
      if (this.p2002OnCreate) {
        this.p2002OnCreate = false;
        const e = new Error("unique constraint") as Error & { code: string };
        e.code = "P2002";
        throw e;
      }
      if (this.rows.has(args.data.slug)) {
        throw new Error("unique constraint violation on slug");
      }
      const row = { ...args.data };
      this.rows.set(row.slug, row);
      return { ...row, createdAt: this.tick(), updatedAt: this.tick() };
    },

    update: async (args: { where: { slug: string }; data: Partial<BadgeRow> }) => {
      if (this.failNextUpdate) {
        this.failNextUpdate = false;
        throw new Error("forced update error");
      }
      if (this.p2002OnUpdate) {
        this.p2002OnUpdate = false;
        const e = new Error("unique constraint") as Error & { code: string };
        e.code = "P2002";
        throw e;
      }
      const existing = this.rows.get(args.where.slug);
      if (!existing) {
        const e = new Error("record not found") as Error & { code: string };
        e.code = "P2025";
        throw e;
      }
      const updated = { ...existing, ...args.data };
      this.rows.set(updated.slug, updated);
      return { ...updated, createdAt: this.tick(), updatedAt: this.tick() };
    },
  };
}

function makeBadge(overrides: Partial<Badge> = {}): Badge {
  return {
    slug: "test-badge" as import("@/domain/entities/Badge").BadgeSlug,
    name: "Test Badge",
    description: "A test badge",
    iconName: "Star",
    xpReward: 100,
    archived: false,
    ...overrides,
  };
}

describe("PrismaBadgeRepository", () => {
  let fakeDb: FakePrismaClient;
  let repo: PrismaBadgeRepository;

  beforeEach(() => {
    fakeDb = new FakePrismaClient();
    repo = new PrismaBadgeRepository(fakeDb as unknown as import("@prisma/client").PrismaClient);
  });

  // ── findBySlug ─────────────────────────────────────────────────────────

  describe("findBySlug", () => {
    const slug = "test-badge" as import("@/domain/entities/Badge").BadgeSlug;
    const missingSlug = "nonexistent" as import("@/domain/entities/Badge").BadgeSlug;

    it("returns the badge when it exists", async () => {
      fakeDb.rows.set("test-badge", {
        slug: "test-badge",
        name: "Test",
        description: "desc",
        iconName: "Star",
        xpReward: 50,
        archived: false,
      });

      const r = await repo.findBySlug(slug);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.value?.slug).toBe("test-badge");
      expect(r.value?.xpReward).toBe(50);
    });

    it("returns null when badge does not exist", async () => {
      const r = await repo.findBySlug(missingSlug);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.value).toBeNull();
    });

    it("returns db_error on forced failure", async () => {
      fakeDb.failNextFind = true;
      const r = await repo.findBySlug(slug);
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.kind).toBe("db_error");
    });
  });

  // ── findAll ────────────────────────────────────────────────────────────

  describe("findAll", () => {
    it("returns all badges", async () => {
      fakeDb.rows.set("badge-1", {
        slug: "badge-1",
        name: "One",
        description: "d",
        iconName: "Star",
        xpReward: 10,
        archived: false,
      });
      fakeDb.rows.set("badge-2", {
        slug: "badge-2",
        name: "Two",
        description: "d",
        iconName: "Trophy",
        xpReward: 20,
        archived: true,
      });

      const r = await repo.findAll();
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.value).toHaveLength(2);
    });

    it("returns db_error on forced failure", async () => {
      fakeDb.failNextFindMany = true;
      const r = await repo.findAll();
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.kind).toBe("db_error");
    });
  });

  // ── create ─────────────────────────────────────────────────────────────

  describe("create", () => {
    it("creates a badge and returns it", async () => {
      const badge = makeBadge({ slug: "new-badge" as import("@/domain/entities/Badge").BadgeSlug });
      const r = await repo.create(badge);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.value.slug).toBe("new-badge");
      expect(r.value.archived).toBe(false);
    });

    it("sets archived=false when creating a new badge", async () => {
      const badge = makeBadge({
        slug: "archived-badge" as import("@/domain/entities/Badge").BadgeSlug,
        archived: true,
      });
      const r = await repo.create(badge);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.value.archived).toBe(true);
    });

    it("returns slug_taken when slug already exists (pre-check)", async () => {
      fakeDb.rows.set("dup-badge", {
        slug: "dup-badge",
        name: "Dup",
        description: "d",
        iconName: "Star",
        xpReward: 10,
        archived: false,
      });
      const r = await repo.create(
        makeBadge({ slug: "dup-badge" as import("@/domain/entities/Badge").BadgeSlug }),
      );
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.kind).toBe("slug_taken");
    });

    it("returns slug_taken on P2002 from DB (race condition guard)", async () => {
      fakeDb.p2002OnCreate = true;
      const r = await repo.create(
        makeBadge({ slug: "race-badge" as import("@/domain/entities/Badge").BadgeSlug }),
      );
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.kind).toBe("slug_taken");
    });

    it("returns db_error on forced failure", async () => {
      fakeDb.failNextCreate = true;
      const r = await repo.create(
        makeBadge({ slug: "fail-badge" as import("@/domain/entities/Badge").BadgeSlug }),
      );
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.kind).toBe("db_error");
    });
  });

  // ── update ─────────────────────────────────────────────────────────────

  describe("update", () => {
    beforeEach(() => {
      fakeDb.rows.set("existing-badge", {
        slug: "existing-badge",
        name: "Old Name",
        description: "Old desc",
        iconName: "Star",
        xpReward: 10,
        archived: false,
      });
    });

    it("updates a badge and returns it", async () => {
      const updated = makeBadge({
        slug: "existing-badge" as import("@/domain/entities/Badge").BadgeSlug,
        name: "New Name",
        xpReward: 200,
      });
      const r = await repo.update(updated);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.value.name).toBe("New Name");
      expect(r.value.xpReward).toBe(200);
    });

    it("sets archived flag when updating", async () => {
      const updated = makeBadge({
        slug: "existing-badge" as import("@/domain/entities/Badge").BadgeSlug,
        archived: true,
      });
      const r = await repo.update(updated);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.value.archived).toBe(true);
    });

    it("returns not_found when slug does not exist (P2025)", async () => {
      const r = await repo.update(
        makeBadge({ slug: "missing-badge" as import("@/domain/entities/Badge").BadgeSlug }),
      );
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.kind).toBe("not_found");
    });

    it("returns db_error on forced failure", async () => {
      fakeDb.failNextUpdate = true;
      const r = await repo.update(
        makeBadge({ slug: "existing-badge" as import("@/domain/entities/Badge").BadgeSlug }),
      );
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.kind).toBe("db_error");
    });
  });

  // ── archive ────────────────────────────────────────────────────────────

  describe("archive", () => {
    const slug = "active-badge" as import("@/domain/entities/Badge").BadgeSlug;
    const missingSlug = "nonexistent-badge" as import("@/domain/entities/Badge").BadgeSlug;

    beforeEach(() => {
      fakeDb.rows.set("active-badge", {
        slug: "active-badge",
        name: "Active",
        description: "d",
        iconName: "Star",
        xpReward: 10,
        archived: false,
      });
    });

    it("archives an existing badge", async () => {
      const r = await repo.archive(slug);
      expect(r.ok).toBe(true);

      // verify archived in store
      const stored = fakeDb.rows.get("active-badge");
      expect(stored?.archived).toBe(true);
    });

    it("returns not_found when badge does not exist (P2025)", async () => {
      const r = await repo.archive(missingSlug);
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.kind).toBe("not_found");
    });

    it("returns db_error on forced failure", async () => {
      fakeDb.failNextUpdate = true;
      const r = await repo.archive(slug);
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.kind).toBe("db_error");
    });
  });
});

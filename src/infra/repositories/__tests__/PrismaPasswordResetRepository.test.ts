/**
 * PrismaPasswordResetRepository adapter test — STORY-010.
 *
 * Uses a hand-rolled in-memory PrismaClient fake so the test
 * stays fast and DB-free. The fake implements the same surface
 * the adapter calls: `create`, `findUnique`, `updateMany`.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { PrismaPasswordResetRepository } from "@/infra/repositories/PrismaPasswordResetRepository";

class FakePrismaClient {
  rows: Array<{
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    usedAt: Date | null;
    createdAt: Date;
  }> = [];
  private nextId = 1;
  failNextCreate = false;
  failNextFind = false;
  failNextUpdate = false;

  passwordReset = {
    create: async (args: {
      data: {
        userId: string;
        tokenHash: string;
        expiresAt: Date;
      };
    }) => {
      if (this.failNextCreate) {
        this.failNextCreate = false;
        throw new Error("forced create error");
      }
      const row = {
        id: `row-${this.nextId++}`,
        userId: args.data.userId,
        tokenHash: args.data.tokenHash,
        expiresAt: args.data.expiresAt,
        usedAt: null as Date | null,
        createdAt: new Date(),
      };
      this.rows.push(row);
      return row;
    },
    findUnique: async (args: { where: { tokenHash: string } }) => {
      if (this.failNextFind) {
        this.failNextFind = false;
        throw new Error("forced find error");
      }
      return this.rows.find((r) => r.tokenHash === args.where.tokenHash) ?? null;
    },
    updateMany: async (args: {
      where: { id?: string; userId?: string; usedAt: Date | null };
      data: { usedAt: Date };
    }) => {
      if (this.failNextUpdate) {
        this.failNextUpdate = false;
        throw new Error("forced update error");
      }
      let count = 0;
      for (const r of this.rows) {
        const idOk = args.where.id === undefined || r.id === args.where.id;
        const userOk = args.where.userId === undefined || r.userId === args.where.userId;
        const usedOk = r.usedAt === args.where.usedAt;
        if (idOk && userOk && usedOk) {
          r.usedAt = args.data.usedAt;
          count += 1;
        }
      }
      return { count };
    },
  };
}

describe("PrismaPasswordResetRepository", () => {
  let db: FakePrismaClient;
  let repo: PrismaPasswordResetRepository;

  beforeEach(() => {
    db = new FakePrismaClient();
    repo = new PrismaPasswordResetRepository(db as never);
  });

  // ── create + findByTokenHash round-trip ──────────────

  it("create returns a new id; findByTokenHash round-trips expiresAt and usedAt", async () => {
    const expiresAt = new Date("2026-08-01T00:00:00Z");
    const createResult = await repo.create({
      userId: "user-1",
      tokenHash: "hash-abc",
      expiresAt,
    });
    expect(createResult.ok).toBe(true);
    if (!createResult.ok) return;
    const id = createResult.value.id;
    expect(id).toMatch(/^row-\d+$/);

    const find = await repo.findByTokenHash("hash-abc");
    expect(find.ok).toBe(true);
    if (!find.ok) return;
    expect(find.value.id).toBe(id);
    expect(find.value.userId).toBe("user-1");
    expect(find.value.tokenHash).toBe("hash-abc");
    expect(find.value.expiresAt.getTime()).toBe(expiresAt.getTime());
    expect(find.value.usedAt).toBeNull();
  });

  it("findByTokenHash returns not_found when the hash is unknown", async () => {
    const result = await repo.findByTokenHash("never-issued");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("not_found");
  });

  // ── markUsed ────────────────────────────────────────

  it("markUsed sets usedAt on a single row by id", async () => {
    const c1 = await repo.create({
      userId: "user-1",
      tokenHash: "hash-1",
      expiresAt: new Date(Date.now() + 3600_000),
    });
    const c2 = await repo.create({
      userId: "user-1",
      tokenHash: "hash-2",
      expiresAt: new Date(Date.now() + 3600_000),
    });
    if (!c1.ok || !c2.ok) throw new Error("seed failed");

    await repo.markUsed(c1.value.id);

    const r1 = await repo.findByTokenHash("hash-1");
    const r2 = await repo.findByTokenHash("hash-2");
    if (!r1.ok || !r2.ok) throw new Error("find failed");
    expect(r1.value.usedAt).toBeInstanceOf(Date);
    expect(r2.value.usedAt).toBeNull(); // unaffected
  });

  // ── invalidateAllForUser ────────────────────────────

  it("invalidateAllForUser marks all unused tokens for a user", async () => {
    const c1 = await repo.create({
      userId: "user-1",
      tokenHash: "hash-1",
      expiresAt: new Date(Date.now() + 3600_000),
    });
    const c2 = await repo.create({
      userId: "user-1",
      tokenHash: "hash-2",
      expiresAt: new Date(Date.now() + 3600_000),
    });
    const c3 = await repo.create({
      userId: "user-2", // different user
      tokenHash: "hash-3",
      expiresAt: new Date(Date.now() + 3600_000),
    });
    if (!c1.ok || !c2.ok || !c3.ok) throw new Error("seed failed");

    // Mark c1 as already-used to ensure invalidateAllForUser skips it
    await repo.markUsed(c1.value.id);

    const result = await repo.invalidateAllForUser("user-1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.count).toBe(1); // only c2 was unused

    // Verify state
    const r1 = await repo.findByTokenHash("hash-1");
    const r2 = await repo.findByTokenHash("hash-2");
    const r3 = await repo.findByTokenHash("hash-3");
    if (!r1.ok || !r2.ok || !r3.ok) throw new Error("find failed");
    expect(r1.value.usedAt).toBeInstanceOf(Date); // untouched, was already used
    expect(r2.value.usedAt).toBeInstanceOf(Date); // newly invalidated
    expect(r3.value.usedAt).toBeNull(); // user-2 unaffected
  });

  it("invalidateAllForUser returns count 0 when the user has no tokens", async () => {
    const result = await repo.invalidateAllForUser("ghost-user");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.count).toBe(0);
  });

  // ── error mapping ───────────────────────────────────

  it("create returns db_error when Prisma throws", async () => {
    db.failNextCreate = true;
    const result = await repo.create({
      userId: "user-1",
      tokenHash: "hash-x",
      expiresAt: new Date(),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });

  it("findByTokenHash returns db_error when Prisma throws", async () => {
    db.failNextFind = true;
    const result = await repo.findByTokenHash("any");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });

  it("markUsed returns db_error when Prisma throws", async () => {
    db.failNextUpdate = true;
    const result = await repo.markUsed("any-id");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });

  it("invalidateAllForUser returns db_error when Prisma throws", async () => {
    db.failNextUpdate = true;
    const result = await repo.invalidateAllForUser("user-1");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });
});

/**
 * PrismaEmailVerificationRepository adapter test — STORY-010.
 *
 * Uses a hand-rolled in-memory PrismaClient fake (not the real
 * PrismaClient) so the test stays fast and DB-free. The fake
 * implements the same surface the adapter calls: `create`,
 * `findUnique`, `updateMany`. Behavior matches what the
 * production schema provides.
 *
 * CI does not run a Postgres service for unit tests; the
 * container wiring test in tests/integration/ confirms the
 * production container points at the real PrismaClient.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { PrismaEmailVerificationRepository } from "@/infra/repositories/PrismaEmailVerificationRepository";

/** In-memory mock that mirrors the PrismaClient surface for this repo. */
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
  // Toggle to force errors per-method
  failNextCreate = false;
  failNextFind = false;
  failNextUpdate = false;

  emailVerification = {
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
      where: { id: string; usedAt: Date | null };
      data: { usedAt: Date };
    }) => {
      if (this.failNextUpdate) {
        this.failNextUpdate = false;
        throw new Error("forced update error");
      }
      let count = 0;
      for (const r of this.rows) {
        if (r.id === args.where.id && r.usedAt === args.where.usedAt) {
          r.usedAt = args.data.usedAt;
          count += 1;
        }
      }
      return { count };
    },
  };
}

describe("PrismaEmailVerificationRepository", () => {
  let db: FakePrismaClient;
  let repo: PrismaEmailVerificationRepository;

  beforeEach(() => {
    db = new FakePrismaClient();
    repo = new PrismaEmailVerificationRepository(db as never);
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

  it("markUsed sets usedAt to a Date so the token is consumed", async () => {
    const createResult = await repo.create({
      userId: "user-1",
      tokenHash: "hash-mark",
      expiresAt: new Date(Date.now() + 3600_000),
    });
    expect(createResult.ok).toBe(true);
    if (!createResult.ok) return;

    const markResult = await repo.markUsed(createResult.value.id);
    expect(markResult.ok).toBe(true);

    const find = await repo.findByTokenHash("hash-mark");
    expect(find.ok).toBe(true);
    if (!find.ok) return;
    expect(find.value.usedAt).toBeInstanceOf(Date);
  });

  it("markUsed is idempotent: a second call is a no-op (does not throw)", async () => {
    const createResult = await repo.create({
      userId: "user-1",
      tokenHash: "hash-idem",
      expiresAt: new Date(Date.now() + 3600_000),
    });
    if (!createResult.ok) throw new Error("seed failed");

    await repo.markUsed(createResult.value.id);
    // Second call: updateMany with usedAt=null matches no rows (count 0).
    // The adapter returns ok regardless.
    const second = await repo.markUsed(createResult.value.id);
    expect(second.ok).toBe(true);

    // The usedAt is still set (not overwritten)
    const find = await repo.findByTokenHash("hash-idem");
    if (!find.ok) throw new Error("find failed");
    expect(find.value.usedAt).toBeInstanceOf(Date);
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
});

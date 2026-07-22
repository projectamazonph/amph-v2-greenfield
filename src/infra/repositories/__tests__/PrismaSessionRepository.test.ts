/**
 * PrismaSessionRepository adapter test — P0-2 follow-up.
 *
 * Uses a hand-rolled in-memory PrismaClient fake so the test stays
 * fast and DB-free, following the pattern established by
 * `PrismaPasswordResetRepository.test.ts` / `PrismaOrderRepository.test.ts`.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { PrismaSessionRepository } from "@/infra/repositories/PrismaSessionRepository";

interface SessionRow {
  id: string;
  userId: string;
  tokenHash: string;
  userAgent: string | null;
  ipAddress: string | null;
  expiresAt: Date;
  createdAt: Date;
}

class FakePrismaClient {
  rows: SessionRow[] = [];
  failNextCreate = false;
  failNextFind = false;
  failNextDelete = false;

  session = {
    create: async (args: { data: Omit<SessionRow, "createdAt"> }) => {
      if (this.failNextCreate) {
        this.failNextCreate = false;
        throw new Error("forced create error");
      }
      if (this.rows.some((r) => r.id === args.data.id)) {
        throw new Error("unique constraint violation on id");
      }
      const row: SessionRow = { ...args.data, createdAt: new Date() };
      this.rows.push(row);
      return row;
    },
    findUnique: async (args: { where: { id: string } }) => {
      if (this.failNextFind) {
        this.failNextFind = false;
        throw new Error("forced find error");
      }
      return this.rows.find((r) => r.id === args.where.id) ?? null;
    },
    deleteMany: async (args: { where: { id?: string; userId?: string } }) => {
      if (this.failNextDelete) {
        this.failNextDelete = false;
        throw new Error("forced delete error");
      }
      const before = this.rows.length;
      this.rows = this.rows.filter((r) => {
        const idMatch = args.where.id === undefined || r.id === args.where.id;
        const userMatch = args.where.userId === undefined || r.userId === args.where.userId;
        return !(idMatch && userMatch);
      });
      return { count: before - this.rows.length };
    },
  };
}

describe("PrismaSessionRepository", () => {
  let db: FakePrismaClient;
  let repo: PrismaSessionRepository;

  beforeEach(() => {
    db = new FakePrismaClient();
    repo = new PrismaSessionRepository(db as never);
  });

  it("create + findById round-trips the core fields", async () => {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const createResult = await repo.create({
      id: "s-1",
      userId: "u-1",
      tokenHash: "jwt:s-1",
      expiresAt,
    });
    expect(createResult.ok).toBe(true);
    if (!createResult.ok) return;
    expect(createResult.value.id).toBe("s-1");

    const findResult = await repo.findById("s-1");
    expect(findResult.ok).toBe(true);
    if (!findResult.ok) return;
    expect(findResult.value.userId).toBe("u-1");
    expect(findResult.value.tokenHash).toBe("jwt:s-1");
    expect(findResult.value.expiresAt).toEqual(expiresAt);
    expect(findResult.value.createdAt).toBeInstanceOf(Date);
  });

  it("create accepts optional userAgent and ipAddress without erroring", async () => {
    const result = await repo.create({
      id: "s-2",
      userId: "u-1",
      tokenHash: "jwt:s-2",
      expiresAt: new Date(),
      userAgent: "Mozilla/5.0",
      ipAddress: "127.0.0.1",
    });
    expect(result.ok).toBe(true);
  });

  it("findById returns not_found for an unknown id", async () => {
    const result = await repo.findById("ghost");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("not_found");
  });

  it("deleteById removes the session (logout)", async () => {
    await repo.create({ id: "s-1", userId: "u-1", tokenHash: "h", expiresAt: new Date() });
    const deleteResult = await repo.deleteById("s-1");
    expect(deleteResult.ok).toBe(true);

    const findResult = await repo.findById("s-1");
    expect(findResult.ok).toBe(false);
  });

  it("deleteById is idempotent — deleting an unknown id is not an error", async () => {
    const result = await repo.deleteById("never-existed");
    expect(result.ok).toBe(true);
  });

  it("deleteAllForUser removes every session for that user and leaves others intact", async () => {
    await repo.create({ id: "s-1", userId: "u-1", tokenHash: "h1", expiresAt: new Date() });
    await repo.create({ id: "s-2", userId: "u-1", tokenHash: "h2", expiresAt: new Date() });
    await repo.create({ id: "s-3", userId: "u-2", tokenHash: "h3", expiresAt: new Date() });

    const result = await repo.deleteAllForUser("u-1");
    expect(result.ok).toBe(true);

    expect((await repo.findById("s-1")).ok).toBe(false);
    expect((await repo.findById("s-2")).ok).toBe(false);
    const survivor = await repo.findById("s-3");
    expect(survivor.ok).toBe(true);
    if (survivor.ok) expect(survivor.value.userId).toBe("u-2");
  });

  it("deleteAllForUser is a no-op when the user has no sessions", async () => {
    const result = await repo.deleteAllForUser("nope");
    expect(result.ok).toBe(true);
  });

  // ── error mapping ──────────────────────────────────────────

  it("create returns db_error when Prisma throws", async () => {
    db.failNextCreate = true;
    const result = await repo.create({
      id: "s-1",
      userId: "u-1",
      tokenHash: "h",
      expiresAt: new Date(),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });

  it("findById returns db_error when Prisma throws", async () => {
    db.failNextFind = true;
    const result = await repo.findById("any");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });

  it("deleteById returns db_error when Prisma throws", async () => {
    db.failNextDelete = true;
    const result = await repo.deleteById("any");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });

  it("deleteAllForUser returns db_error when Prisma throws", async () => {
    db.failNextDelete = true;
    const result = await repo.deleteAllForUser("any");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });
});

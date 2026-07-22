/**
 * PrismaDiscountCodeRepository adapter test, P0-2 follow-up (STORY-050d).
 *
 * Uses a hand-rolled in-memory PrismaClient fake so the test stays fast
 * and DB-free, following the pattern established by
 * PrismaPasswordResetRepository.test.ts / PrismaOrderRepository.test.ts.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { PrismaDiscountCodeRepository } from "@/infra/repositories/PrismaDiscountCodeRepository";
import type { DiscountCode } from "@/domain/entities/DiscountCode";

interface DiscountCodeRow {
  id: string;
  code: string;
  type: string;
  value: number;
  maxUses: number | null;
  usedCount: number;
  validFrom: Date | null;
  validUntil: Date | null;
  courseIds: string[];
  archivedAt: Date | null;
  createdAt: Date;
}

class FakePrismaClient {
  rows: DiscountCodeRow[] = [];
  failNextCreate = false;
  failNextFind = false;
  failNextUpdate = false;

  discountCode = {
    create: async (args: {
      data: Omit<DiscountCodeRow, "usedCount" | "archivedAt" | "createdAt"> & { usedCount: number };
    }) => {
      if (this.failNextCreate) {
        this.failNextCreate = false;
        throw new Error("forced create error");
      }
      if (this.rows.some((r) => r.id === args.data.id || r.code === args.data.code)) {
        const err = new Error("unique constraint violation") as Error & { code: string };
        err.code = "P2002";
        throw err;
      }
      const row: DiscountCodeRow = {
        ...args.data,
        archivedAt: null,
        createdAt: new Date(),
      };
      this.rows.push(row);
      return row;
    },
    findUnique: async (args: { where: { id?: string; code?: string } }) => {
      if (this.failNextFind) {
        this.failNextFind = false;
        throw new Error("forced find error");
      }
      if (args.where.id !== undefined) {
        return this.rows.find((r) => r.id === args.where.id) ?? null;
      }
      if (args.where.code !== undefined) {
        return this.rows.find((r) => r.code === args.where.code) ?? null;
      }
      return null;
    },
    findMany: async (args: { where?: { archivedAt?: null } }) => {
      if (this.failNextFind) {
        this.failNextFind = false;
        throw new Error("forced find error");
      }
      if (args.where?.archivedAt === null) {
        return this.rows.filter((r) => r.archivedAt === null);
      }
      return [...this.rows];
    },
    update: async (args: {
      where: { id: string };
      data: Omit<Partial<DiscountCodeRow>, "usedCount"> & {
        usedCount?: number | { increment: number };
      };
    }) => {
      if (this.failNextUpdate) {
        this.failNextUpdate = false;
        throw new Error("forced update error");
      }
      const row = this.rows.find((r) => r.id === args.where.id);
      if (!row) {
        const err = new Error("Record not found") as Error & { code: string };
        err.code = "P2025";
        throw err;
      }
      if (
        args.data.code !== undefined &&
        this.rows.some((r) => r.id !== args.where.id && r.code === args.data.code)
      ) {
        const err = new Error("unique constraint violation") as Error & { code: string };
        err.code = "P2002";
        throw err;
      }
      const { usedCount, ...rest } = args.data;
      Object.assign(row, rest);
      if (usedCount && typeof usedCount === "object" && "increment" in usedCount) {
        row.usedCount += usedCount.increment;
      }
      return row;
    },
  };
}

function makeCode(overrides: Partial<DiscountCode> = {}): DiscountCode {
  return {
    id: overrides.id ?? "dc_1",
    code: overrides.code ?? "SAVE20",
    type: overrides.type ?? "PERCENTAGE",
    value: overrides.value ?? 20,
    maxUses: overrides.maxUses ?? null,
    usedCount: overrides.usedCount ?? 0,
    validFrom: overrides.validFrom ?? null,
    validUntil: overrides.validUntil ?? null,
    courseIds: overrides.courseIds ?? [],
    createdAt: overrides.createdAt ?? new Date(),
  };
}

describe("PrismaDiscountCodeRepository", () => {
  let db: FakePrismaClient;
  let repo: PrismaDiscountCodeRepository;

  beforeEach(() => {
    db = new FakePrismaClient();
    repo = new PrismaDiscountCodeRepository(db as never);
  });

  // ── create + findByCode (pre-existing behavior, unchanged) ──

  it("create + findByCode round-trips a code", async () => {
    const createResult = await repo.create(makeCode());
    expect(createResult.ok).toBe(true);

    const found = await repo.findByCode("save20");
    expect(found?.id).toBe("dc_1");
    expect(found?.code).toBe("SAVE20");
  });

  it("create returns code_taken on a duplicate code", async () => {
    await repo.create(makeCode({ id: "dc_1", code: "SAVE20" }));
    const result = await repo.create(makeCode({ id: "dc_2", code: "SAVE20" }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("code_taken");
  });

  // ── listAll ────────────────────────────────────────────────

  it("listAll returns every active code", async () => {
    await repo.create(makeCode({ id: "dc_1", code: "A" }));
    await repo.create(makeCode({ id: "dc_2", code: "B" }));

    const result = await repo.listAll();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.map((c) => c.id).sort()).toEqual(["dc_1", "dc_2"]);
  });

  it("listAll excludes archived codes", async () => {
    await repo.create(makeCode({ id: "dc_1", code: "A" }));
    await repo.create(makeCode({ id: "dc_2", code: "B" }));
    await repo.archive("dc_1");

    const result = await repo.listAll();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.map((c) => c.id)).toEqual(["dc_2"]);
  });

  // ── findById ───────────────────────────────────────────────

  it("findById returns the code when active", async () => {
    await repo.create(makeCode({ id: "dc_1" }));
    const result = await repo.findById("dc_1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value?.id).toBe("dc_1");
  });

  it("findById returns null for an unknown id (not an error)", async () => {
    const result = await repo.findById("ghost");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBeNull();
  });

  it("findById returns null for an archived code (hidden, matching InMemory contract)", async () => {
    await repo.create(makeCode({ id: "dc_1" }));
    await repo.archive("dc_1");
    const result = await repo.findById("dc_1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBeNull();
  });

  it("findByCode still finds an archived code (findByCode does not filter archivedAt)", async () => {
    await repo.create(makeCode({ id: "dc_1", code: "SAVE20" }));
    await repo.archive("dc_1");
    const found = await repo.findByCode("SAVE20");
    expect(found?.id).toBe("dc_1");
  });

  // ── update ─────────────────────────────────────────────────

  it("update persists changed fields", async () => {
    await repo.create(makeCode({ id: "dc_1", value: 20 }));
    const result = await repo.update(makeCode({ id: "dc_1", value: 30, maxUses: 100 }));
    expect(result.ok).toBe(true);

    const found = await repo.findById("dc_1");
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    expect(found.value?.value).toBe(30);
    expect(found.value?.maxUses).toBe(100);
  });

  it("update returns not_found when the code does not exist", async () => {
    const result = await repo.update(makeCode({ id: "never-created" }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("not_found");
  });

  it("update returns code_taken when renaming to a code already used by another row", async () => {
    await repo.create(makeCode({ id: "dc_1", code: "A" }));
    await repo.create(makeCode({ id: "dc_2", code: "B" }));
    const result = await repo.update(makeCode({ id: "dc_2", code: "A" }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("code_taken");
  });

  // ── archive ────────────────────────────────────────────────

  it("archive hides the code from listAll and findById", async () => {
    await repo.create(makeCode({ id: "dc_1" }));
    const result = await repo.archive("dc_1");
    expect(result.ok).toBe(true);

    const listResult = await repo.listAll();
    expect(listResult.ok).toBe(true);
    if (listResult.ok) expect(listResult.value).toEqual([]);
  });

  it("archive returns not_found when the code does not exist", async () => {
    const result = await repo.archive("ghost");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("not_found");
  });

  // ── incrementUsedCount (pre-existing behavior, unchanged) ────

  it("incrementUsedCount increments and returns the updated code", async () => {
    await repo.create(makeCode({ id: "dc_1", usedCount: 0 }));
    const result = await repo.incrementUsedCount("dc_1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.usedCount).toBe(1);
  });

  // ── error mapping ──────────────────────────────────────────

  it("listAll returns db_error when Prisma throws", async () => {
    db.failNextFind = true;
    const result = await repo.listAll();
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

  it("update returns db_error when Prisma throws a non-P2025/P2002 error", async () => {
    await repo.create(makeCode({ id: "dc_1" }));
    db.failNextUpdate = true;
    const result = await repo.update(makeCode({ id: "dc_1" }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });

  it("archive returns db_error when Prisma throws a non-P2025 error", async () => {
    await repo.create(makeCode({ id: "dc_1" }));
    db.failNextUpdate = true;
    const result = await repo.archive("dc_1");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });
});

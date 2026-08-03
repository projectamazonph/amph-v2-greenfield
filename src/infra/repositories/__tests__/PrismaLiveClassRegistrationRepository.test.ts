/**
 * PrismaLiveClassRegistrationRepository adapter test — STORY-100.
 *
 * Uses a hand-rolled in-memory PrismaClient fake so the test stays fast
 * and DB-free, following the pattern established by
 * PrismaLiveClassRepository.test.ts.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { PrismaLiveClassRegistrationRepository } from "@/infra/repositories/PrismaLiveClassRegistrationRepository";
import type { LiveClassRegistration } from "@/domain/entities/LiveClassRegistration";

interface RegistrationRow {
  id: string;
  userId: string;
  liveClassId: string;
  status: string;
  registeredAt: Date;
  cancelledAt: Date | null;
  watchedRecordingAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

class FakePrismaClient {
  rows: RegistrationRow[] = [];
  failNextCreate = false;
  failNextFind = false;
  failNextUpdate = false;

  liveClassRegistration = {
    create: async (args: { data: Omit<RegistrationRow, "createdAt" | "updatedAt"> }) => {
      if (this.failNextCreate) {
        this.failNextCreate = false;
        throw new Error("forced create error");
      }
      if (
        this.rows.some(
          (r) => r.userId === args.data.userId && r.liveClassId === args.data.liveClassId,
        )
      ) {
        const err = new Error("unique constraint violation") as Error & { code: string };
        err.code = "P2002";
        throw err;
      }
      const row: RegistrationRow = { ...args.data, createdAt: new Date(), updatedAt: new Date() };
      this.rows.push(row);
      return row;
    },
    findUnique: async (args: {
      where: { userId_liveClassId: { userId: string; liveClassId: string } };
    }) => {
      if (this.failNextFind) {
        this.failNextFind = false;
        throw new Error("forced find error");
      }
      const { userId, liveClassId } = args.where.userId_liveClassId;
      return this.rows.find((r) => r.userId === userId && r.liveClassId === liveClassId) ?? null;
    },
    findMany: async (args: {
      where?: { userId?: string; liveClassId?: string };
      orderBy?: { registeredAt: "asc" | "desc" };
    }) => {
      if (this.failNextFind) {
        this.failNextFind = false;
        throw new Error("forced find error");
      }
      let rows = [...this.rows];
      if (args.where?.userId !== undefined) {
        rows = rows.filter((r) => r.userId === args.where!.userId);
      }
      if (args.where?.liveClassId !== undefined) {
        rows = rows.filter((r) => r.liveClassId === args.where!.liveClassId);
      }
      if (args.orderBy?.registeredAt === "desc") {
        rows.sort((a, b) => b.registeredAt.getTime() - a.registeredAt.getTime());
      }
      return rows;
    },
    update: async (args: {
      where: { userId_liveClassId: { userId: string; liveClassId: string } };
      data: Partial<RegistrationRow>;
    }) => {
      if (this.failNextUpdate) {
        this.failNextUpdate = false;
        throw new Error("forced update error");
      }
      const { userId, liveClassId } = args.where.userId_liveClassId;
      const row = this.rows.find((r) => r.userId === userId && r.liveClassId === liveClassId);
      if (!row) {
        const err = new Error("Record not found") as Error & { code: string };
        err.code = "P2025";
        throw err;
      }
      Object.assign(row, args.data, { updatedAt: new Date() });
      return row;
    },
  };
}

function makeRegistration(overrides: Partial<LiveClassRegistration> = {}): LiveClassRegistration {
  return {
    id: overrides.id ?? "reg_1",
    userId: overrides.userId ?? "user_1",
    liveClassId: overrides.liveClassId ?? "lc_1",
    status: overrides.status ?? "registered",
    registeredAt: overrides.registeredAt ?? new Date("2026-08-01T00:00:00Z"),
    cancelledAt: overrides.cancelledAt ?? null,
    watchedRecordingAt: overrides.watchedRecordingAt ?? null,
    createdAt: overrides.createdAt ?? new Date(),
    updatedAt: overrides.updatedAt ?? new Date(),
  };
}

describe("PrismaLiveClassRegistrationRepository", () => {
  let db: FakePrismaClient;
  let repo: PrismaLiveClassRegistrationRepository;

  beforeEach(() => {
    db = new FakePrismaClient();
    repo = new PrismaLiveClassRegistrationRepository(db as never);
  });

  it("create + findByUserAndClass round-trips a registration", async () => {
    const createResult = await repo.create(makeRegistration());
    expect(createResult.ok).toBe(true);

    const found = await repo.findByUserAndClass("user_1", "lc_1");
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    expect(found.value?.status).toBe("registered");
    expect(found.value?.watchedRecordingAt).toBeNull();
  });

  it("findByUserAndClass returns null when no row exists (not an error)", async () => {
    const result = await repo.findByUserAndClass("ghost", "lc_1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBeNull();
  });

  it("create returns already_registered on a duplicate (userId, liveClassId)", async () => {
    await repo.create(makeRegistration());
    const result = await repo.create(makeRegistration({ id: "reg_2" }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("already_registered");
  });

  it("listByUser returns rows newest-first", async () => {
    await repo.create(
      makeRegistration({ liveClassId: "lc_1", registeredAt: new Date("2026-08-01T00:00:00Z") }),
    );
    await repo.create(
      makeRegistration({ liveClassId: "lc_2", registeredAt: new Date("2026-08-02T00:00:00Z") }),
    );
    const result = await repo.listByUser("user_1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.map((r) => r.liveClassId)).toEqual(["lc_2", "lc_1"]);
  });

  it("listByLiveClass returns all rows for a class", async () => {
    await repo.create(makeRegistration({ userId: "user_1" }));
    await repo.create(makeRegistration({ userId: "user_2" }));
    const result = await repo.listByLiveClass("lc_1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.map((r) => r.userId).sort()).toEqual(["user_1", "user_2"]);
  });

  it("update persists a watchedRecordingAt + status change", async () => {
    await repo.create(makeRegistration());
    const watchedAt = new Date("2026-08-03T00:00:00Z");
    const result = await repo.update(
      makeRegistration({ status: "attended", watchedRecordingAt: watchedAt }),
    );
    expect(result.ok).toBe(true);

    const found = await repo.findByUserAndClass("user_1", "lc_1");
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    expect(found.value?.status).toBe("attended");
    expect(found.value?.watchedRecordingAt).toEqual(watchedAt);
  });

  it("update returns not_found when the registration does not exist", async () => {
    const result = await repo.update(makeRegistration());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("not_found");
  });

  it("mapRow throws (surfaced as db_error) on a corrupt persisted status", async () => {
    await repo.create(makeRegistration());
    db.rows[0]!.status = "SOME_LEGACY_VALUE";
    const result = await repo.findByUserAndClass("user_1", "lc_1");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });

  it("create returns db_error when Prisma throws", async () => {
    db.failNextCreate = true;
    const result = await repo.create(makeRegistration());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });

  it("findByUserAndClass returns db_error when Prisma throws", async () => {
    db.failNextFind = true;
    const result = await repo.findByUserAndClass("user_1", "lc_1");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });

  it("listByUser returns db_error when Prisma throws", async () => {
    db.failNextFind = true;
    const result = await repo.listByUser("user_1");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });

  it("listByLiveClass returns db_error when Prisma throws", async () => {
    db.failNextFind = true;
    const result = await repo.listByLiveClass("lc_1");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });

  it("update returns db_error when Prisma throws a non-P2025 error", async () => {
    await repo.create(makeRegistration());
    db.failNextUpdate = true;
    const result = await repo.update(makeRegistration());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });
});

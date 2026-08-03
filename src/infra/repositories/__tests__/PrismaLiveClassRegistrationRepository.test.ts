/**
 * PrismaLiveClassRegistrationRepository.test.ts — Proposal 3.
 *
 * Hand-rolled in-memory PrismaClient fake, following the pattern
 * established by PrismaUserRepository.twoFactor.test.ts /
 * PrismaEnrollmentRepository's error-handling conventions.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { PrismaLiveClassRegistrationRepository } from "@/infra/repositories/PrismaLiveClassRegistrationRepository";
import {
  createLiveClassRegistration,
  cancelRegistration,
} from "@/domain/entities/LiveClassRegistration";
import { Result } from "@/domain/shared/Result";

interface Row {
  id: string;
  userId: string;
  liveClassId: string;
  status: string;
  registeredAt: Date;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function makeRow(overrides: Partial<Row> = {}): Row {
  const now = new Date("2026-08-02T00:00:00Z");
  return {
    id: "reg1",
    userId: "u1",
    liveClassId: "lc1",
    status: "registered",
    registeredAt: now,
    cancelledAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

class FakePrismaClient {
  rows: Row[] = [];

  liveClassRegistration = {
    findMany: async (args: {
      where: { userId?: string; liveClassId?: string };
      orderBy?: { registeredAt?: "asc" | "desc" };
    }) => {
      const filtered = this.rows.filter((r) => {
        if (args.where.userId && r.userId !== args.where.userId) return false;
        if (args.where.liveClassId && r.liveClassId !== args.where.liveClassId) return false;
        return true;
      });
      if (args.orderBy?.registeredAt === "desc") {
        filtered.sort((a, b) => b.registeredAt.getTime() - a.registeredAt.getTime());
      }
      return filtered;
    },
    findUnique: async (args: {
      where: { userId_liveClassId: { userId: string; liveClassId: string } };
    }) => {
      const { userId, liveClassId } = args.where.userId_liveClassId;
      return this.rows.find((r) => r.userId === userId && r.liveClassId === liveClassId) ?? null;
    },
    create: async (args: { data: Row }) => {
      const dup = this.rows.some(
        (r) => r.userId === args.data.userId && r.liveClassId === args.data.liveClassId,
      );
      if (dup) {
        const err = new Error("Unique constraint failed");
        (err as unknown as { code: string }).code = "P2002";
        throw err;
      }
      const row: Row = { ...makeRow(), ...args.data, createdAt: new Date(), updatedAt: new Date() };
      this.rows.push(row);
      return row;
    },
    update: async (args: {
      where: { userId_liveClassId: { userId: string; liveClassId: string } };
      data: Partial<Row>;
    }) => {
      const { userId, liveClassId } = args.where.userId_liveClassId;
      const row = this.rows.find((r) => r.userId === userId && r.liveClassId === liveClassId);
      if (!row) {
        const err = new Error("record not found");
        (err as unknown as { code: string }).code = "P2025";
        throw err;
      }
      Object.assign(row, args.data);
      return row;
    },
  };
}

describe("PrismaLiveClassRegistrationRepository", () => {
  let db: FakePrismaClient;
  let repo: PrismaLiveClassRegistrationRepository;

  beforeEach(() => {
    db = new FakePrismaClient();
    repo = new PrismaLiveClassRegistrationRepository(db as never);
  });

  describe("create", () => {
    it("persists a new RSVP", async () => {
      const created = createLiveClassRegistration({ id: "reg1", userId: "u1", liveClassId: "lc1" });
      if (!created.ok) throw new Error("fixture failed");
      const result = await repo.create(created.value);
      expect(result.ok).toBe(true);
      expect(db.rows).toHaveLength(1);
      expect(db.rows[0]?.status).toBe("registered");
    });

    it("returns already_registered on a duplicate (userId, liveClassId)", async () => {
      const created = createLiveClassRegistration({ id: "reg1", userId: "u1", liveClassId: "lc1" });
      if (!created.ok) throw new Error("fixture failed");
      await repo.create(created.value);
      const second = createLiveClassRegistration({ id: "reg2", userId: "u1", liveClassId: "lc1" });
      if (!second.ok) throw new Error("fixture failed");
      const result = await repo.create(second.value);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.kind).toBe("already_registered");
    });
  });

  describe("findByUserAndClass", () => {
    it("returns null when there is no RSVP yet", async () => {
      const result = await repo.findByUserAndClass("u1", "lc1");
      expect(result.ok).toBe(true);
      expect(result.ok && result.value).toBeNull();
    });

    it("returns the RSVP row when one exists", async () => {
      db.rows.push(makeRow());
      const result = await repo.findByUserAndClass("u1", "lc1");
      expect(result.ok).toBe(true);
      if (!result.ok || !result.value) return;
      expect(result.value.id).toBe("reg1");
      expect(result.value.status).toBe("registered");
    });

    it("returns db_error when the row has a corrupt persisted status", async () => {
      db.rows.push(makeRow({ status: "bogus_status" }));
      const result = await repo.findByUserAndClass("u1", "lc1");
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.kind).toBe("db_error");
    });
  });

  describe("listByUser / listByLiveClass", () => {
    it("lists RSVPs for a user, newest first", async () => {
      db.rows.push(
        makeRow({ id: "r1", liveClassId: "lc1", registeredAt: new Date("2026-08-01T00:00:00Z") }),
        makeRow({ id: "r2", liveClassId: "lc2", registeredAt: new Date("2026-08-02T00:00:00Z") }),
      );
      const result = await repo.listByUser("u1");
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.map((r) => r.id)).toEqual(["r2", "r1"]);
    });

    it("lists RSVPs for a live class", async () => {
      db.rows.push(makeRow({ id: "r1", userId: "u1" }), makeRow({ id: "r2", userId: "u2" }));
      const result = await repo.listByLiveClass("lc1");
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value).toHaveLength(2);
    });
  });

  describe("update", () => {
    it("persists a cancellation", async () => {
      db.rows.push(makeRow());
      const found = await repo.findByUserAndClass("u1", "lc1");
      if (!found.ok || !found.value) throw new Error("fixture failed");
      const cancelled = cancelRegistration(found.value, new Date("2026-08-02T12:00:00Z"));
      const result = await repo.update(cancelled);
      expect(result.ok).toBe(true);
      expect(db.rows[0]?.status).toBe("cancelled");
      expect(db.rows[0]?.cancelledAt).toEqual(new Date("2026-08-02T12:00:00Z"));
    });

    it("returns not_found when the row doesn't exist", async () => {
      const created = createLiveClassRegistration({ id: "reg1", userId: "u1", liveClassId: "lc1" });
      if (!created.ok) throw new Error("fixture failed");
      const result = await repo.update(created.value);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.kind).toBe("not_found");
    });
  });

  it("round-trips through create → findByUserAndClass → update (re-RSVP)", async () => {
    const created = createLiveClassRegistration({ id: "reg1", userId: "u1", liveClassId: "lc1" });
    if (!created.ok) throw new Error("fixture failed");
    await repo.create(created.value);

    const found = await repo.findByUserAndClass("u1", "lc1");
    if (!Result.isOk(found) || !found.value) throw new Error("expected a row");
    const cancelled = cancelRegistration(found.value);
    await repo.update(cancelled);

    const afterCancel = await repo.findByUserAndClass("u1", "lc1");
    expect(Result.isOk(afterCancel) && afterCancel.value?.status).toBe("cancelled");
  });
});

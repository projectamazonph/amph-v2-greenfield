/**
 * PrismaUserRepository.lockout.test.ts — Proposal 1 (account lockout).
 *
 * Scoped to the lockout-specific surface added to PrismaUserRepository
 * (recordLoginAttempt). Follows the hand-rolled FakePrismaClient pattern
 * established by PrismaUserRepository.twoFactor.test.ts.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { PrismaUserRepository } from "@/infra/repositories/PrismaUserRepository";

interface UserRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "STUDENT" | "INSTRUCTOR" | "ADMIN";
  subscriptionTier: "FREE" | "STARTER" | "PRO";
  verificationStatus: "UNVERIFIED" | "VERIFIED" | "SUSPENDED";
  enrolledCourseIds: string[];
  twoFactorEnabled: boolean;
  failedLoginCount: number;
  lockedUntil: Date | null;
  createdAt: Date;
  totalXp: number;
  emailVerifiedAt: Date | null;
}

function makeRow(overrides: Partial<UserRow> = {}): UserRow {
  return {
    id: "u1",
    email: "student@example.com",
    firstName: "Student",
    lastName: "User",
    role: "STUDENT",
    subscriptionTier: "FREE",
    verificationStatus: "VERIFIED",
    enrolledCourseIds: [],
    twoFactorEnabled: false,
    failedLoginCount: 0,
    lockedUntil: null,
    createdAt: new Date("2026-07-26T00:00:00Z"),
    totalXp: 0,
    emailVerifiedAt: null,
    ...overrides,
  };
}

type UpdateData = Partial<Omit<UserRow, "failedLoginCount">> & {
  failedLoginCount?: number | { increment: number };
};

class FakePrismaClient {
  rows: UserRow[] = [];

  user = {
    findUnique: async (args: { where: { id: string } }) => {
      return this.rows.find((r) => r.id === args.where.id) ?? null;
    },
    update: async (args: {
      where: { id: string };
      data: UpdateData;
      select?: { failedLoginCount?: boolean };
    }) => {
      const row = this.rows.find((r) => r.id === args.where.id);
      if (!row) {
        const err = new Error("record not found");
        (err as unknown as { code: string }).code = "P2025";
        throw err;
      }
      const { failedLoginCount, ...rest } = args.data;
      if (typeof failedLoginCount === "number") {
        row.failedLoginCount = failedLoginCount;
      } else if (failedLoginCount && typeof failedLoginCount === "object") {
        row.failedLoginCount += failedLoginCount.increment;
      }
      Object.assign(row, rest);
      if (args.select?.failedLoginCount) {
        return { failedLoginCount: row.failedLoginCount };
      }
      return row;
    },
  };
}

describe("PrismaUserRepository — recordLoginAttempt", () => {
  let db: FakePrismaClient;
  let repo: PrismaUserRepository;

  beforeEach(() => {
    db = new FakePrismaClient();
    repo = new PrismaUserRepository(db as never);
  });

  describe("success", () => {
    it("clears the failed-login streak and any lockout", async () => {
      db.rows.push(makeRow({ failedLoginCount: 4, lockedUntil: new Date("2026-08-02T12:00:00Z") }));
      const result = await repo.recordLoginAttempt("u1", { kind: "success" });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value).toEqual({ lockedUntil: null });
      expect(db.rows[0]?.failedLoginCount).toBe(0);
      expect(db.rows[0]?.lockedUntil).toBeNull();
    });

    it("returns not_found for a nonexistent user", async () => {
      const result = await repo.recordLoginAttempt("nobody", { kind: "success" });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.kind).toBe("not_found");
    });
  });

  describe("failure", () => {
    it("increments the streak and does not lock below maxAttempts", async () => {
      db.rows.push(makeRow({ failedLoginCount: 2 }));
      const result = await repo.recordLoginAttempt("u1", {
        kind: "failure",
        maxAttempts: 5,
        lockUntil: new Date("2026-08-02T12:15:00Z"),
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value).toEqual({ lockedUntil: null });
      expect(db.rows[0]?.failedLoginCount).toBe(3);
      expect(db.rows[0]?.lockedUntil).toBeNull();
    });

    it("locks the account once the streak reaches maxAttempts", async () => {
      db.rows.push(makeRow({ failedLoginCount: 4 }));
      const lockUntil = new Date("2026-08-02T12:15:00Z");
      const result = await repo.recordLoginAttempt("u1", {
        kind: "failure",
        maxAttempts: 5,
        lockUntil,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value).toEqual({ lockedUntil: lockUntil });
      expect(db.rows[0]?.failedLoginCount).toBe(5);
      expect(db.rows[0]?.lockedUntil).toEqual(lockUntil);
    });

    it("returns not_found for a nonexistent user", async () => {
      const result = await repo.recordLoginAttempt("nobody", {
        kind: "failure",
        maxAttempts: 5,
        lockUntil: new Date("2026-08-02T12:15:00Z"),
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.kind).toBe("not_found");
    });
  });
});

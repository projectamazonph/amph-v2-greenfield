/**
 * PrismaUserRepository.welcome.test.ts — STORY-146.
 *
 * Scoped to the welcome-completion surface added to PrismaUserRepository
 * (markWelcomeCompleted, resetWelcome). Mirrors the per-method test-file
 * split established by PrismaUserRepository.{twoFactor,lockout}.test.ts,
 * and the FakePrismaClient pattern from those files.
 *
 * The brief's spec says markWelcomeCompleted MUST be idempotent —
 * calling twice preserves the first timestamp. The InMemory adapter
 * enforces that at the read-then-conditional-update level; this Prisma
 * adapter enforces it via `updateMany` with a `welcomeCompletedAt: null`
 * filter in the WHERE clause (the same idempotency-by-conditional-update
 * pattern PrismaEmailVerificationRepository.markUsed and
 * PrismaLiveClassRegistrationRepository.markWatchedRecording use).
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
  welcomeCompletedAt: Date | null;
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
    welcomeCompletedAt: null,
    createdAt: new Date("2026-07-26T00:00:00Z"),
    totalXp: 0,
    emailVerifiedAt: null,
    ...overrides,
  };
}

/**
 * Hand-rolled FakePrismaClient, modeled on the twoFactor/lockout test
 * files but extended with `updateMany`. The fake applies the same
 * `welcomeCompletedAt: null` filter the production adapter uses, so
 * the idempotency test exercises real conditional-update logic instead
 * of just patching the row.
 */
class FakePrismaClient {
  rows: UserRow[] = [];

  user = {
    findUnique: async (args: { where: { id: string } }) => {
      return this.rows.find((r) => r.id === args.where.id) ?? null;
    },
    update: async (args: { where: { id: string }; data: Partial<UserRow> }) => {
      const row = this.rows.find((r) => r.id === args.where.id);
      if (!row) {
        const err = new Error("record not found");
        (err as unknown as { code: string }).code = "P2025";
        throw err;
      }
      Object.assign(row, args.data);
      return row;
    },
    updateMany: async (args: {
      where: { id: string; welcomeCompletedAt?: Date | null | { not: null } };
      data: Partial<UserRow>;
    }) => {
      const row = this.rows.find((r) => r.id === args.where.id);
      if (!row) return { count: 0 };
      const filter = args.where.welcomeCompletedAt;
      let matches = true;
      if (filter === null) matches = row.welcomeCompletedAt === null;
      else if (filter && typeof filter === "object" && "not" in filter) {
        matches = row.welcomeCompletedAt !== null;
      } else if (filter instanceof Date) {
        matches = row.welcomeCompletedAt?.getTime() === filter.getTime();
      }
      if (!matches) return { count: 0 };
      Object.assign(row, args.data);
      return { count: 1 };
    },
  };
}

describe("PrismaUserRepository — welcome (STORY-146)", () => {
  let db: FakePrismaClient;
  let repo: PrismaUserRepository;

  beforeEach(() => {
    db = new FakePrismaClient();
    repo = new PrismaUserRepository(db as never);
  });

  it("markWelcomeCompleted sets the timestamp on a fresh user", async () => {
    db.rows.push(makeRow());
    const result = await repo.markWelcomeCompleted("u1", new Date("2026-09-20T00:00:00Z"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.welcomeCompletedAt).toEqual(new Date("2026-09-20T00:00:00Z"));
    expect(db.rows[0]?.welcomeCompletedAt).toEqual(new Date("2026-09-20T00:00:00Z"));
  });

  it("markWelcomeCompleted is idempotent — second call preserves the first timestamp", async () => {
    db.rows.push(makeRow());
    const first = new Date("2026-09-20T00:00:00Z");
    const r1 = await repo.markWelcomeCompleted("u1", first);
    expect(r1.ok).toBe(true);
    if (r1.ok) expect(r1.value.welcomeCompletedAt).toEqual(first);

    // Second call with a different timestamp should NOT overwrite.
    const second = new Date("2026-12-31T00:00:00Z");
    const r2 = await repo.markWelcomeCompleted("u1", second);
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    expect(r2.value.welcomeCompletedAt).toEqual(first);
    expect(db.rows[0]?.welcomeCompletedAt).toEqual(first);
  });

  it("resetWelcome clears the timestamp", async () => {
    db.rows.push(makeRow({ welcomeCompletedAt: new Date("2026-09-20T00:00:00Z") }));
    const result = await repo.resetWelcome("u1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.welcomeCompletedAt).toBeNull();
    expect(db.rows[0]?.welcomeCompletedAt).toBeNull();
  });

  it("resetWelcome is a no-op when welcomeCompletedAt is already null", async () => {
    db.rows.push(makeRow({ welcomeCompletedAt: null }));
    const before = new Date("2026-07-26T00:00:00Z");
    const result = await repo.resetWelcome("u1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.welcomeCompletedAt).toBeNull();
    // createdAt is untouched (proves we didn't accidentally clobber the row).
    expect(db.rows[0]?.createdAt).toEqual(before);
  });

  it("returns not_found for a nonexistent user (markWelcomeCompleted)", async () => {
    const result = await repo.markWelcomeCompleted("nobody", new Date());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("not_found");
  });

  it("returns not_found for a nonexistent user (resetWelcome)", async () => {
    const result = await repo.resetWelcome("nobody");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("not_found");
  });
});

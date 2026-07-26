/**
 * PrismaUserRepository.twoFactor.test.ts — audit hardening follow-up.
 *
 * Scoped to the 2FA-specific surface added to PrismaUserRepository
 * (getTwoFactorSecret, setTwoFactorSecret, twoFactorEnabled in mapRow).
 * No pre-existing test file covered this adapter's other methods before
 * this change — out of scope to backfill here.
 *
 * Hand-rolled in-memory PrismaClient fake, following the pattern
 * established by PrismaAuditLog.test.ts.
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
  twoFactorSecret: string | null;
  createdAt: Date;
  totalXp: number;
  emailVerifiedAt: Date | null;
}

function makeRow(overrides: Partial<UserRow> = {}): UserRow {
  return {
    id: "u1",
    email: "admin@example.com",
    firstName: "Admin",
    lastName: "User",
    role: "ADMIN",
    subscriptionTier: "FREE",
    verificationStatus: "VERIFIED",
    enrolledCourseIds: [],
    twoFactorEnabled: false,
    twoFactorSecret: null,
    createdAt: new Date("2026-07-26T00:00:00Z"),
    totalXp: 0,
    emailVerifiedAt: null,
    ...overrides,
  };
}

class FakePrismaClient {
  rows: UserRow[] = [];
  failNextUpdate = false;

  user = {
    findUnique: async (args: { where: { id: string }; select?: { twoFactorSecret?: boolean } }) => {
      const row = this.rows.find((r) => r.id === args.where.id);
      if (!row) return null;
      if (args.select?.twoFactorSecret) {
        return { twoFactorSecret: row.twoFactorSecret };
      }
      return row;
    },
    update: async (args: { where: { id: string }; data: Partial<UserRow> }) => {
      if (this.failNextUpdate) {
        this.failNextUpdate = false;
        const err = new Error("record not found");
        (err as unknown as { code: string }).code = "P2025";
        throw err;
      }
      const row = this.rows.find((r) => r.id === args.where.id);
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

describe("PrismaUserRepository — 2FA", () => {
  let db: FakePrismaClient;
  let repo: PrismaUserRepository;

  beforeEach(() => {
    db = new FakePrismaClient();
    repo = new PrismaUserRepository(db as never);
  });

  it("getTwoFactorSecret returns null when 2FA was never enrolled", async () => {
    db.rows.push(makeRow());
    const result = await repo.getTwoFactorSecret("u1");
    expect(result.ok).toBe(true);
    expect(result.ok && result.value).toBeNull();
  });

  it("getTwoFactorSecret returns the stored secret", async () => {
    db.rows.push(makeRow({ twoFactorSecret: "SOMESECRET" }));
    const result = await repo.getTwoFactorSecret("u1");
    expect(result.ok && result.value).toBe("SOMESECRET");
  });

  it("getTwoFactorSecret returns not_found for a nonexistent user", async () => {
    const result = await repo.getTwoFactorSecret("nobody");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("not_found");
  });

  it("setTwoFactorSecret persists a new secret", async () => {
    db.rows.push(makeRow());
    const result = await repo.setTwoFactorSecret("u1", "NEWSECRET");
    expect(result.ok).toBe(true);
    expect(db.rows[0]?.twoFactorSecret).toBe("NEWSECRET");
  });

  it("setTwoFactorSecret(null) clears the secret", async () => {
    db.rows.push(makeRow({ twoFactorSecret: "OLDSECRET" }));
    await repo.setTwoFactorSecret("u1", null);
    expect(db.rows[0]?.twoFactorSecret).toBeNull();
  });

  it("setTwoFactorSecret returns not_found for a nonexistent user", async () => {
    const result = await repo.setTwoFactorSecret("nobody", "x");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("not_found");
  });

  it("update({ twoFactorEnabled }) flips the flag and mapRow reflects it", async () => {
    db.rows.push(makeRow({ twoFactorEnabled: false }));
    const result = await repo.update("u1", { twoFactorEnabled: true });
    expect(result.ok).toBe(true);
    expect(result.ok && result.value.twoFactorEnabled).toBe(true);
  });

  it("findById maps twoFactorEnabled but never exposes twoFactorSecret on the User entity", async () => {
    db.rows.push(makeRow({ twoFactorEnabled: true, twoFactorSecret: "SHOULD_NOT_LEAK" }));
    const result = await repo.findById("u1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.twoFactorEnabled).toBe(true);
    expect(result.value).not.toHaveProperty("twoFactorSecret");
  });
});

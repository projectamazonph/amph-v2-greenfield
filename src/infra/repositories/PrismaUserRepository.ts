/**
 * PrismaUserRepository — Story 002.
 *
 * The production adapter for the UserRepository port.
 * All methods return Result<T, E> — never throw across the layer boundary.
 */

import { PrismaClient } from "@prisma/client";
import { Result } from "@/domain/shared/Result";
import type { UserRepository, UserError } from "@/ports/repositories/UserRepository";
import type { Role } from "@/domain/entities/User";

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly db: PrismaClient) {}

  async findById(id: string): Promise<Result<import("@/domain/entities/User").User, UserError>> {
    try {
      const row = await this.db.user.findUnique({ where: { id } });
      if (!row) return Result.err({ kind: "not_found" });
      return Result.ok(this.mapRow(row));
    } catch (err) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async listAll(): Promise<Result<readonly import("@/domain/entities/User").User[], UserError>> {
    try {
      const rows = await this.db.user.findMany({ orderBy: { createdAt: "desc" } });
      return Result.ok(rows.map((r) => this.mapRow(r)));
    } catch (err) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async findByEmail(email: string): Promise<Result<import("@/domain/entities/User").User, UserError>> {
    try {
      const row = await this.db.user.findUnique({
        where: { email: email.toLowerCase() },
      });
      if (!row) return Result.err({ kind: "not_found" });
      return Result.ok(this.mapRow(row));
    } catch (err) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async create(params: {
    id: string;
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
  }): Promise<Result<import("@/domain/entities/User").User, UserError>> {
    try {
      const row = await this.db.user.create({
        data: {
          id: params.id,
          email: params.email.toLowerCase(),
          password: params.passwordHash,
          firstName: params.firstName,
          lastName: params.lastName,
          role: "STUDENT",
          emailVerificationToken: null,
          verificationStatus: "UNVERIFIED",
          subscriptionTier: "FREE",
          simulatorAccess: "NONE",
          enrolledCourseIds: [],
        },
      });
      return Result.ok(this.mapRow(row));
    } catch (err: unknown) {
      // Prisma error code P2002 = unique constraint violation (email_taken)
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code: string }).code === "P2002"
      ) {
        return Result.err({ kind: "email_taken" });
      }
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async update(
    id: string,
    patch: Partial<{
      firstName: string;
      lastName: string;
      avatarUrl: string;
      bio: string;
      enrolledCourseIds: string[];
      emailVerifiedAt: Date | null;
      passwordHash: string;
    }>,
  ): Promise<Result<import("@/domain/entities/User").User, UserError>> {
    try {
      // Map the passwordHash patch field to Prisma's `password` column.
      const { passwordHash, ...rest } = patch;
      const data: Record<string, unknown> = { ...rest };
      if (passwordHash !== undefined) data["password"] = passwordHash;
      const row = await this.db.user.update({
        where: { id },
        data,
      });
      return Result.ok(this.mapRow(row));
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code: string }).code === "P2025"
      ) {
        return Result.err({ kind: "not_found" });
      }
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async emailExists(email: string): Promise<Result<boolean, UserError>> {
    try {
      const row = await this.db.user.findUnique({
        where: { email: email.toLowerCase() },
        select: { id: true },
      });
      return Result.ok(row !== null);
    } catch (err) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async getPasswordHash(id: string): Promise<Result<string, UserError>> {
    try {
      const row = await this.db.user.findUnique({
        where: { id },
        select: { password: true },
      });
      if (!row) return Result.err({ kind: "not_found" });
      return Result.ok(row.password);
    } catch (err) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  // ── Private helpers ────────────────────────────────────────

  async updateTotalXp(userId: string, newTotalXp: number): Promise<Result<import("@/domain/entities/User").User, UserError>> {
    try {
      const row = await this.db.user.update({
        where: { id: userId },
        data: { totalXp: newTotalXp },
      });
      return Result.ok(this.mapRow(row));
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code: string }).code === "P2025"
      ) {
        return Result.err({ kind: "not_found" });
      }
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  // ── Private helpers ────────────────────────────────────────

  private mapRow(row: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: Role;
    subscriptionTier: "FREE" | "STARTER" | "PRO";
    verificationStatus: "UNVERIFIED" | "VERIFIED" | "SUSPENDED";
    enrolledCourseIds: string[];
    createdAt: Date;
    totalXp: number;
    emailVerifiedAt: Date | null;
  }) {
    return Object.freeze({
      id: row.id,
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
      role: row.role,
      subscriptionTier: row.subscriptionTier,
      verificationStatus: row.verificationStatus,
      enrolledCourseIds: Object.freeze([...row.enrolledCourseIds]),
      createdAt: row.createdAt,
      totalXp: row.totalXp,
      emailVerifiedAt: row.emailVerifiedAt,
    });
  }
}

/**
 * PrismaUserRepository — Story 002.
 *
 * The production adapter for the UserRepository port.
 * All methods return Result<T, E> — never throw across the layer boundary.
 */

import { PrismaClient } from "@prisma/client";
import { Result } from "@/lib/Result";
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
    }>,
  ): Promise<Result<import("@/domain/entities/User").User, UserError>> {
    try {
      const row = await this.db.user.update({
        where: { id },
        data: patch,
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

  private mapRow(row: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: Role;
    subscriptionTier: "FREE" | "STARTER" | "PRO";
    verificationStatus: "UNVERIFIED" | "VERIFIED" | "SUSPENDED";
    createdAt: Date;
  }) {
    return Object.freeze({
      id: row.id,
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
      role: row.role,
      subscriptionTier: row.subscriptionTier,
      verificationStatus: row.verificationStatus,
      createdAt: row.createdAt,
    });
  }
}

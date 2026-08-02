/**
 * PrismaLiveClassRegistrationRepository — production adapter for
 * ILiveClassRegistrationRepository.
 *
 * Proposal 3: replaces InMemoryLiveClassRegistrationRepository in
 * production, which lost every RSVP on cold start / redeploy. Mirrors
 * PrismaEnrollmentRepository's mapping/error-handling conventions
 * (P2002 → already_registered, P2025 → not_found, invalid persisted
 * status throws — caught here and turned into a db_error).
 */

import { PrismaClient } from "@prisma/client";
import { Result } from "@/domain/shared/Result";
import type {
  ILiveClassRegistrationRepository,
  LiveClassRegistrationRepositoryError,
} from "@/ports/repositories/ILiveClassRegistrationRepository";
import type { LiveClassRegistration } from "@/domain/entities/LiveClassRegistration";
import { isValidRegistrationStatus } from "@/domain/entities/LiveClassRegistration";

export class PrismaLiveClassRegistrationRepository implements ILiveClassRegistrationRepository {
  constructor(private readonly db: PrismaClient) {}

  async listByUser(
    userId: string,
  ): Promise<Result<LiveClassRegistration[], LiveClassRegistrationRepositoryError>> {
    try {
      const rows = await this.db.liveClassRegistration.findMany({
        where: { userId },
        orderBy: { registeredAt: "desc" },
      });
      return Result.ok(rows.map((r) => this.mapRow(r)));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async listByLiveClass(
    liveClassId: string,
  ): Promise<Result<LiveClassRegistration[], LiveClassRegistrationRepositoryError>> {
    try {
      const rows = await this.db.liveClassRegistration.findMany({
        where: { liveClassId },
      });
      return Result.ok(rows.map((r) => this.mapRow(r)));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async findByUserAndClass(
    userId: string,
    liveClassId: string,
  ): Promise<Result<LiveClassRegistration | null, LiveClassRegistrationRepositoryError>> {
    try {
      const row = await this.db.liveClassRegistration.findUnique({
        where: { userId_liveClassId: { userId, liveClassId } },
      });
      if (!row) return Result.ok(null);
      return Result.ok(this.mapRow(row));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async create(
    registration: LiveClassRegistration,
  ): Promise<Result<void, LiveClassRegistrationRepositoryError>> {
    try {
      await this.db.liveClassRegistration.create({
        data: {
          id: registration.id,
          userId: registration.userId,
          liveClassId: registration.liveClassId,
          status: registration.status,
          registeredAt: registration.registeredAt,
          cancelledAt: registration.cancelledAt,
        },
      });
      return Result.ok(undefined);
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code: string }).code === "P2002"
      ) {
        return Result.err({ kind: "already_registered" });
      }
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async update(
    registration: LiveClassRegistration,
  ): Promise<Result<void, LiveClassRegistrationRepositoryError>> {
    try {
      await this.db.liveClassRegistration.update({
        where: {
          userId_liveClassId: {
            userId: registration.userId,
            liveClassId: registration.liveClassId,
          },
        },
        data: {
          status: registration.status,
          cancelledAt: registration.cancelledAt,
        },
      });
      return Result.ok(undefined);
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

  private mapRow(row: {
    id: string;
    userId: string;
    liveClassId: string;
    status: string;
    registeredAt: Date;
    cancelledAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): LiveClassRegistration {
    if (!isValidRegistrationStatus(row.status)) {
      throw new Error(
        `LiveClassRegistration ${row.id} has an invalid persisted status: "${row.status}"`,
      );
    }
    return {
      id: row.id,
      userId: row.userId,
      liveClassId: row.liveClassId,
      status: row.status,
      registeredAt: row.registeredAt,
      cancelledAt: row.cancelledAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

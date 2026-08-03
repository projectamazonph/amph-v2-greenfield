/**
 * PrismaLiveClassRegistrationRepository, production adapter for
 * ILiveClassRegistrationRepository.
 *
 * STORY-100: buildProductionContainer() was still wiring
 * InMemoryLiveClassRegistrationRepository — every RSVP (and, as of
 * STORY-100, every "watched the recording" XP-award guard) vanished on
 * cold start / redeploy. The `live_class_registrations` table already
 * existed (migration 20260801000000_live_class_registration); no adapter
 * had ever been written to read/write it.
 *
 * Merge note: `main` independently fixed the same gap in the same window
 * (PR #275, "Proposal 3") with a functionally-identical adapter. This
 * version wins the merge because STORY-100 also needs `watchedRecordingAt`
 * mapped, which main's version didn't have. Mirrors
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
import { isValidRegistrationStatus } from "@/domain/entities/LiveClassRegistration";
import type { LiveClassRegistration } from "@/domain/entities/LiveClassRegistration";

interface LiveClassRegistrationRow {
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
      return Result.ok(row ? this.mapRow(row) : null);
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
          watchedRecordingAt: registration.watchedRecordingAt,
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
          registeredAt: registration.registeredAt,
          cancelledAt: registration.cancelledAt,
          watchedRecordingAt: registration.watchedRecordingAt,
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

  private mapRow(row: LiveClassRegistrationRow): LiveClassRegistration {
    if (!isValidRegistrationStatus(row.status)) {
      // Caught by the surrounding try/catch in every caller and turned
      // into a db_error. A corrupt or legacy status value must not
      // silently hydrate an invalid LiveClassRegistration.
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
      watchedRecordingAt: row.watchedRecordingAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

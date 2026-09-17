/**
 * PrismaCapstoneRepository — production adapter (LEARN-043).
 */

import { PrismaClient } from "@prisma/client";
import { Result } from "@/domain/shared/Result";
import { isCapstoneStatus, type CapstoneSubmission } from "@/domain/entities/CapstoneSubmission";
import type {
  CapstoneQueryError,
  CapstoneRepoError,
  ICapstoneRepository,
} from "@/ports/repositories/ICapstoneRepository";

interface CapstoneRow {
  id: string;
  userId: string;
  courseId: string | null;
  status: string;
  artefactIds: unknown;
  reviewerNote: string | null;
  submittedAt: Date | null;
  decidedAt: Date | null;
  decidedById: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  createdById: string | null;
  updatedById: string | null;
}

function parseArtefactIds(raw: unknown): readonly string[] {
  if (!Array.isArray(raw)) return [];
  const ids: string[] = [];
  for (const value of raw) {
    if (typeof value === "string" && value.trim().length > 0) ids.push(value);
  }
  return ids;
}

function mapRow(row: CapstoneRow): CapstoneSubmission {
  return {
    id: row.id,
    userId: row.userId,
    courseId: row.courseId,
    status: isCapstoneStatus(row.status) ? row.status : "DRAFT",
    artefactIds: parseArtefactIds(row.artefactIds),
    reviewerNote: row.reviewerNote,
    submittedAt: row.submittedAt,
    decidedAt: row.decidedAt,
    decidedById: row.decidedById,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    createdById: row.createdById ?? "",
    updatedById: row.updatedById ?? "",
  };
}

export class PrismaCapstoneRepository implements ICapstoneRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(
    submission: CapstoneSubmission,
  ): Promise<Result<CapstoneSubmission, CapstoneQueryError>> {
    try {
      const row = await this.db.capstoneSubmission.create({
        data: {
          id: submission.id,
          userId: submission.userId,
          courseId: submission.courseId,
          status: submission.status,
          artefactIds: [...submission.artefactIds],
          createdById: submission.createdById,
          updatedById: submission.updatedById,
        },
      });
      return Result.ok(mapRow(row));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async findById(id: string): Promise<Result<CapstoneSubmission | null, CapstoneQueryError>> {
    try {
      const row = await this.db.capstoneSubmission.findFirst({
        where: { id, deletedAt: null },
      });
      if (!row) return Result.ok(null);
      return Result.ok(mapRow(row));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async findLatestByUser(
    userId: string,
  ): Promise<Result<CapstoneSubmission | null, CapstoneQueryError>> {
    try {
      const row = await this.db.capstoneSubmission.findFirst({
        where: { userId, deletedAt: null },
        orderBy: { createdAt: "desc" },
      });
      if (!row) return Result.ok(null);
      return Result.ok(mapRow(row));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async listByUser(
    userId: string,
  ): Promise<Result<readonly CapstoneSubmission[], CapstoneQueryError>> {
    try {
      const rows = await this.db.capstoneSubmission.findMany({
        where: { userId, deletedAt: null },
        orderBy: { createdAt: "desc" },
      });
      return Result.ok(rows.map(mapRow));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async listByStatus(
    status: import("@/domain/entities/CapstoneSubmission").CapstoneStatus,
  ): Promise<Result<readonly CapstoneSubmission[], CapstoneQueryError>> {
    try {
      const rows = await this.db.capstoneSubmission.findMany({
        where: { status, deletedAt: null },
        orderBy: { createdAt: "asc" },
      });
      return Result.ok(rows.map(mapRow));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async update(
    submission: CapstoneSubmission,
  ): Promise<Result<CapstoneSubmission, CapstoneRepoError>> {
    try {
      const existing = await this.db.capstoneSubmission.findFirst({
        where: { id: submission.id },
      });
      if (!existing) {
        return Result.err({ kind: "not_found" });
      }
      const row = await this.db.capstoneSubmission.update({
        where: { id: submission.id },
        data: {
          status: submission.status,
          artefactIds: [...submission.artefactIds],
          reviewerNote: submission.reviewerNote,
          submittedAt: submission.submittedAt,
          decidedAt: submission.decidedAt,
          decidedById: submission.decidedById,
          updatedAt: submission.updatedAt,
          updatedById: submission.updatedById,
          deletedAt: submission.deletedAt,
        },
      });
      return Result.ok(mapRow(row));
    } catch (err: unknown) {
      const message = String(err);
      if (message.includes("Record to update not found")) {
        return Result.err({ kind: "not_found" });
      }
      return Result.err({ kind: "db_error", message });
    }
  }
}

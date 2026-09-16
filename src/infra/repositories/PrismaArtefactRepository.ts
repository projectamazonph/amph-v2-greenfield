/**
 * PrismaArtefactRepository — production adapter for IArtefactRepository.
 *
 * LEARN-033. Soft-deleted rows (deletedAt set) are invisible to
 * every read, matching the InMemory fake. Update persists the whole
 * row so revise/submit transitions and the actor stamp land
 * together. Payload is stored as JSONB.
 */

import { Prisma, PrismaClient } from "@prisma/client";
import { Result } from "@/domain/shared/Result";
import {
  isArtefactKind,
  isArtefactStatus,
  type ArtefactPayload,
  type LearnerArtefact,
} from "@/domain/entities/LearnerArtefact";
import type {
  ArtefactFilter,
  ArtefactQueryError,
  ArtefactRepoError,
  IArtefactRepository,
} from "@/ports/repositories/IArtefactRepository";

interface ArtefactRow {
  id: string;
  userId: string;
  courseId: string | null;
  kind: string;
  title: string;
  scenarioRef: string | null;
  payload: unknown;
  status: string;
  submittedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  createdById: string | null;
  updatedById: string | null;
}

function isPayload(value: unknown): value is ArtefactPayload {
  if (typeof value !== "object" || value === null) return false;
  const payload = value as Record<string, unknown>;
  return typeof payload.rationale === "string";
}

function mapRow(row: ArtefactRow): LearnerArtefact {
  const kind = isArtefactKind(row.kind) ? row.kind : "decision-log";
  const status = isArtefactStatus(row.status) ? row.status : "DRAFT";
  const payload: ArtefactPayload = isPayload(row.payload)
    ? {
        rationale: row.payload.rationale,
        ...(typeof row.payload.scenarioRef === "string"
          ? { scenarioRef: row.payload.scenarioRef }
          : {}),
        ...(typeof row.payload.fields === "object" && row.payload.fields !== null
          ? { fields: row.payload.fields as Record<string, string> }
          : {}),
      }
    : { rationale: "" };
  return {
    id: row.id,
    userId: row.userId,
    courseId: row.courseId,
    kind,
    title: row.title,
    scenarioRef: row.scenarioRef,
    payload,
    status,
    submittedAt: row.submittedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    createdById: row.createdById ?? "",
    updatedById: row.updatedById ?? "",
  };
}

export class PrismaArtefactRepository implements IArtefactRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(artefact: LearnerArtefact): Promise<Result<LearnerArtefact, ArtefactQueryError>> {
    try {
      const row = await this.db.learnerArtefact.create({
        data: {
          id: artefact.id,
          userId: artefact.userId,
          courseId: artefact.courseId,
          kind: artefact.kind,
          title: artefact.title,
          scenarioRef: artefact.scenarioRef,
          payload: artefact.payload as unknown as Prisma.InputJsonValue,
          status: artefact.status,
          submittedAt: artefact.submittedAt,
          createdById: artefact.createdById,
          updatedById: artefact.updatedById,
        },
      });
      return Result.ok(this.mapRow(row));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async findById(id: string): Promise<Result<LearnerArtefact | null, ArtefactQueryError>> {
    try {
      const row = await this.db.learnerArtefact.findFirst({
        where: { id, deletedAt: null },
      });
      if (!row) return Result.ok(null);
      return Result.ok(this.mapRow(row));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async listByUser(
    userId: string,
    filter?: ArtefactFilter,
  ): Promise<Result<readonly LearnerArtefact[], ArtefactQueryError>> {
    try {
      const rows = await this.db.learnerArtefact.findMany({
        where: {
          userId,
          deletedAt: null,
          ...(filter?.kind !== undefined ? { kind: filter.kind } : {}),
          ...(filter?.status !== undefined ? { status: filter.status } : {}),
          ...(filter?.courseId !== undefined ? { courseId: filter.courseId } : {}),
        },
        orderBy: { createdAt: "desc" },
      });
      return Result.ok(rows.map((row) => this.mapRow(row)));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async findLatestByUserAndKind(
    userId: string,
    kind: import("@/domain/entities/LearnerArtefact").ArtefactKind,
  ): Promise<Result<LearnerArtefact | null, ArtefactQueryError>> {
    try {
      const row = await this.db.learnerArtefact.findFirst({
        where: { userId, kind, deletedAt: null },
        orderBy: { createdAt: "desc" },
      });
      if (!row) return Result.ok(null);
      return Result.ok(this.mapRow(row));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async update(artefact: LearnerArtefact): Promise<Result<LearnerArtefact, ArtefactRepoError>> {
    try {
      const existing = await this.db.learnerArtefact.findFirst({
        where: { id: artefact.id },
      });
      if (!existing) {
        return Result.err({ kind: "not_found" });
      }
      const row = await this.db.learnerArtefact.update({
        where: { id: artefact.id },
        data: {
          title: artefact.title,
          scenarioRef: artefact.scenarioRef,
          payload: artefact.payload as unknown as Prisma.InputJsonValue,
          status: artefact.status,
          submittedAt: artefact.submittedAt,
          updatedAt: artefact.updatedAt,
          updatedById: artefact.updatedById,
          deletedAt: artefact.deletedAt,
        },
      });
      return Result.ok(this.mapRow(row));
    } catch (err: unknown) {
      const message = String(err);
      if (message.includes("Record to update not found")) {
        return Result.err({ kind: "not_found" });
      }
      return Result.err({ kind: "db_error", message });
    }
  }

  private mapRow(row: ArtefactRow): LearnerArtefact {
    return mapRow(row);
  }
}

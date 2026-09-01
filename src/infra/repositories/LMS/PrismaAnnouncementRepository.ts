/**
 * PrismaAnnouncementRepository - P1-07 site-wide announcement banner.
 */

import { PrismaClient } from "@prisma/client";
import { Result } from "@/domain/shared/Result";
import type { AnnouncementRepository, AnnouncementError } from "@/ports/repositories/LMS/AnnouncementRepository";
import type { Announcement } from "@/domain/entities/LMS/Announcement";

export class PrismaAnnouncementRepository implements AnnouncementRepository {
  constructor(private readonly db: PrismaClient) {}

  async getActive(): Promise<Result<readonly Announcement[], AnnouncementError>> {
    try {
      const now = new Date();
      const rows = await this.db.announcement.findMany({
        where: {
          isActive: true,
          OR: [
            { startAt: null },
            { startAt: { lte: now } },
          ],
          AND: [
            { endAt: null },
            { endAt: { gte: now } },
          ],
        },
        orderBy: { createdAt: "desc" },
      });
      return Result.ok(rows.map((r) => this.mapRow(r)));
    } catch (err) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async findById(id: string): Promise<Result<Announcement, AnnouncementError>> {
    try {
      const row = await this.db.announcement.findUnique({ where: { id } });
      if (!row) return Result.err({ kind: "not_found" });
      return Result.ok(this.mapRow(row));
    } catch (err) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async listAll(): Promise<Result<readonly Announcement[], AnnouncementError>> {
    try {
      const rows = await this.db.announcement.findMany({
        orderBy: { createdAt: "desc" },
      });
      return Result.ok(rows.map((r) => this.mapRow(r)));
    } catch (err) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async create(params: {
    title: string;
    content: string;
    severity?: "info" | "warning" | "critical";
    isActive?: boolean;
    startAt?: Date | null;
    endAt?: Date | null;
    createdById?: string | null;
  }): Promise<Result<Announcement, AnnouncementError>> {
    try {
      const row = await this.db.announcement.create({
        data: {
          title: params.title,
          content: params.content,
          severity: params.severity ?? "info",
          isActive: params.isActive ?? true,
          startAt: params.startAt ?? null,
          endAt: params.endAt ?? null,
          createdById: params.createdById ?? null,
        },
      });
      return Result.ok(this.mapRow(row));
    } catch (err) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async update(
    id: string,
    patch: Partial<{
      title: string;
      content: string;
      severity: "info" | "warning" | "critical";
      isActive: boolean;
      startAt: Date | null;
      endAt: Date | null;
    }>,
  ): Promise<Result<Announcement, AnnouncementError>> {
    try {
      const row = await this.db.announcement.update({
        where: { id },
        data: { ...patch },
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

  async delete(id: string): Promise<Result<void, AnnouncementError>> {
    try {
      await this.db.announcement.delete({ where: { id } });
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

  // Dismissal is handled via cookies in the UI layer, not in the database
  async dismissForUser(announcementId: string, userId: string | null): Promise<Result<void, AnnouncementError>> {
    // No-op for database implementation; dismissal is client-side
    return Result.ok(undefined);
  }

  async isDismissedByUser(announcementId: string, userId: string | null): Promise<Result<boolean, AnnouncementError>> {
    // No-op for database implementation; dismissal is client-side
    return Result.ok(false);
  }

  private mapRow(row: {
    id: string;
    title: string;
    content: string;
    severity: "info" | "warning" | "critical";
    isActive: boolean;
    startAt: Date | null;
    endAt: Date | null;
    createdById: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): Announcement {
    return Object.freeze({
      id: row.id,
      title: row.title,
      content: row.content,
      severity: row.severity,
      isActive: row.isActive,
      startAt: row.startAt,
      endAt: row.endAt,
      createdById: row.createdById,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}

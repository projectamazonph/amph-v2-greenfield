/**
 * PrismaAnnouncementRepository — production adapter for IAnnouncementRepository.
 *
 * P1-07 (P4 PR-A). Mirrors PrismaDiscountCodeRepository: filters on
 * `deletedAt: null` for listAll / findById, returns the not_found error
 * kind on Prisma P2025, db_error on everything else.
 */

import { PrismaClient } from "@prisma/client";
import { Result } from "@/domain/shared/Result";
import {
  hydrateAnnouncement,
  isAnnouncementLevel,
  type Announcement,
  type AnnouncementLevel,
} from "@/domain/entities/Announcement";
import type {
  IAnnouncementRepository,
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
  AnnouncementError,
} from "@/ports/repositories/IAnnouncementRepository";

interface AnnouncementRow {
  id: string;
  title: string;
  body: string;
  level: string;
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  dismissible: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  createdById: string | null;
  updatedById: string | null;
}

export class PrismaAnnouncementRepository implements IAnnouncementRepository {
  constructor(private readonly db: PrismaClient) {}

  async listActive(now: Date): Promise<Result<readonly Announcement[], AnnouncementError>> {
    try {
      const rows = await this.db.announcement.findMany({
        where: { deletedAt: null, isActive: true },
        orderBy: { createdAt: "desc" },
      });
      const mapped = rows.map((r) => this.mapRow(r));
      // Visibility is a runtime check — Prisma cannot encode the
      // (startsAt <= now < endsAt) window as a single indexable predicate
      // without sacrificing the `endsAt IS NULL` OR `endsAt > now` clause.
      return Result.ok(mapped.filter((a) => a.isVisibleAt(now)));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async findById(id: string): Promise<Result<Announcement | null, AnnouncementError>> {
    try {
      const row = await this.db.announcement.findUnique({ where: { id } });
      if (!row || row.deletedAt !== null) return Result.ok(null);
      return Result.ok(this.mapRow(row));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async create(
    input: CreateAnnouncementInput,
    actor: { id: string },
  ): Promise<Result<Announcement, AnnouncementError>> {
    try {
      const row = await this.db.announcement.create({
        data: {
          title: input.title,
          body: input.body,
          level: input.level,
          isActive: input.isActive,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
          dismissible: input.dismissible,
          createdById: actor.id,
          updatedById: actor.id,
        },
      });
      return Result.ok(this.mapRow(row));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async update(
    id: string,
    input: UpdateAnnouncementInput,
    actor: { id: string },
  ): Promise<Result<Announcement, AnnouncementError>> {
    try {
      const row = await this.db.announcement.update({
        where: { id },
        data: { ...input, updatedById: actor.id },
      });
      return Result.ok(this.mapRow(row));
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err) {
        const code = (err as { code: string }).code;
        if (code === "P2025") return Result.err({ kind: "not_found" });
      }
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async setActive(
    id: string,
    active: boolean,
    actor: { id: string },
  ): Promise<Result<Announcement, AnnouncementError>> {
    try {
      const row = await this.db.announcement.update({
        where: { id },
        data: { isActive: active, updatedById: actor.id },
      });
      return Result.ok(this.mapRow(row));
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err) {
        const code = (err as { code: string }).code;
        if (code === "P2025") return Result.err({ kind: "not_found" });
      }
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async listAll(): Promise<Result<readonly Announcement[], AnnouncementError>> {
    try {
      const rows = await this.db.announcement.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
      });
      return Result.ok(rows.map((r) => this.mapRow(r)));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  private mapRow(row: AnnouncementRow): Announcement {
    // The `level` column is a free String in the schema; narrow it
    // through hydrateAnnouncement's type. An invalid value would
    // throw at runtime — surfaces a bad seed/migration loudly.
    if (!isAnnouncementLevel(row.level)) {
      throw new Error(`Announcement ${row.id} has invalid level: ${row.level}`);
    }
    return hydrateAnnouncement({
      id: row.id,
      title: row.title,
      body: row.body,
      level: row.level as AnnouncementLevel,
      isActive: row.isActive,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      dismissible: row.dismissible,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      createdById: row.createdById,
      updatedById: row.updatedById,
    });
  }
}

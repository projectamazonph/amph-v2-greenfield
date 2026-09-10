/**
 * InMemoryAnnouncementRepository — test fake for IAnnouncementRepository.
 *
 * P1-07 (P4 PR-A). Stores rows in a Map, mints cuid-shaped ids from the
 * constructor-provided generator. Mirrors PrismaAnnouncementRepository's
 * deletedAt-filtering contract.
 */

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

interface StoredRow {
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

export interface InMemoryAnnouncementRepositoryOptions {
  idGen?: () => string;
  clock?: () => Date;
}

export class InMemoryAnnouncementRepository implements IAnnouncementRepository {
  private readonly rows = new Map<string, StoredRow>();
  private readonly idGen: () => string;
  private readonly clock: () => Date;

  constructor(options: InMemoryAnnouncementRepositoryOptions = {}) {
    let counter = 0;
    this.idGen = options.idGen ?? (() => `ann_${++counter}`);
    this.clock = options.clock ?? (() => new Date());
  }

  async listActive(now: Date): Promise<Result<readonly Announcement[], AnnouncementError>> {
    const visible = Array.from(this.rows.values())
      .filter((r) => r.deletedAt === null)
      .map((r) => this.toEntity(r))
      .filter((a) => a.isVisibleAt(now));
    return Result.ok(visible);
  }

  async findById(id: string): Promise<Result<Announcement | null, AnnouncementError>> {
    const row = this.rows.get(id);
    if (!row || row.deletedAt !== null) return Result.ok(null);
    return Result.ok(this.toEntity(row));
  }

  async create(
    input: CreateAnnouncementInput,
    actor: { id: string },
  ): Promise<Result<Announcement, AnnouncementError>> {
    const now = this.clock();
    const id = this.idGen();
    const row: StoredRow = {
      id,
      title: input.title,
      body: input.body,
      level: input.level,
      isActive: input.isActive,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      dismissible: input.dismissible,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      createdById: actor.id,
      updatedById: actor.id,
    };
    this.rows.set(id, row);
    return Result.ok(this.toEntity(row));
  }

  async update(
    id: string,
    input: UpdateAnnouncementInput,
    actor: { id: string },
  ): Promise<Result<Announcement, AnnouncementError>> {
    const row = this.rows.get(id);
    if (!row || row.deletedAt !== null) return Result.err({ kind: "not_found" });
    // Strip undefined keys so a partial update doesn't accidentally
    // clear existing fields — `{ ...row, level: undefined }` would.
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input)) {
      if (v !== undefined) patch[k] = v;
    }
    const updated: StoredRow = {
      ...row,
      ...patch,
      updatedAt: this.clock(),
      updatedById: actor.id,
    };
    this.rows.set(id, updated);
    return Result.ok(this.toEntity(updated));
  }

  async setActive(
    id: string,
    active: boolean,
    actor: { id: string },
  ): Promise<Result<Announcement, AnnouncementError>> {
    const row = this.rows.get(id);
    if (!row || row.deletedAt !== null) return Result.err({ kind: "not_found" });
    const updated: StoredRow = {
      ...row,
      isActive: active,
      updatedAt: this.clock(),
      updatedById: actor.id,
    };
    this.rows.set(id, updated);
    return Result.ok(this.toEntity(updated));
  }

  async listAll(): Promise<Result<readonly Announcement[], AnnouncementError>> {
    const all = Array.from(this.rows.values())
      .filter((r) => r.deletedAt === null)
      .map((r) => this.toEntity(r));
    return Result.ok(all);
  }

  /** Test helper: hard-delete a row (skips soft-delete). */
  _hardDelete(id: string): void {
    this.rows.delete(id);
  }

  /** Test helper: seed a row directly, bypassing the port. */
  _seed(row: Omit<StoredRow, "deletedAt">): Announcement {
    const stored: StoredRow = { ...row, deletedAt: null };
    this.rows.set(stored.id, stored);
    return this.toEntity(stored);
  }

  private toEntity(row: StoredRow): Announcement {
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

/**
 * PrismaResourceRepository, production adapter for IResourceRepository.
 *
 * STORY-098. "Deleting" a resource is a soft transition to
 * isPublished=false, matching InMemoryResourceRepository's contract;
 * there is no hard delete. Migration 20260803000000_resource adds
 * the table.
 */

import { PrismaClient } from "@prisma/client";
import { Result } from "@/domain/shared/Result";
import type {
  IResourceRepository,
  ResourceRepositoryError,
} from "@/ports/repositories/IResourceRepository";
import {
  isValidResourceCategory,
  isValidResourceFileType,
  isValidResourceAccessTier,
} from "@/domain/entities/Resource";
import type { Resource } from "@/domain/entities/Resource";

interface ResourceRow {
  id: string;
  title: string;
  description: string;
  category: string;
  fileType: string;
  fileUrl: string;
  accessTier: string;
  isPublished: boolean;
  downloadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export class PrismaResourceRepository implements IResourceRepository {
  constructor(private readonly db: PrismaClient) {}

  async listAll(): Promise<Result<Resource[], ResourceRepositoryError>> {
    try {
      const rows = await this.db.resource.findMany({ orderBy: { createdAt: "desc" } });
      return Result.ok(rows.map((r) => this.mapRow(r)));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async listPublished(): Promise<Result<Resource[], ResourceRepositoryError>> {
    try {
      const rows = await this.db.resource.findMany({
        where: { isPublished: true },
        orderBy: { createdAt: "desc" },
      });
      return Result.ok(rows.map((r) => this.mapRow(r)));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async findById(id: string): Promise<Result<Resource | null, ResourceRepositoryError>> {
    try {
      const row = await this.db.resource.findUnique({ where: { id } });
      return Result.ok(row ? this.mapRow(row) : null);
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async create(resource: Resource): Promise<Result<void, ResourceRepositoryError>> {
    try {
      await this.db.resource.create({
        data: {
          id: resource.id,
          title: resource.title,
          description: resource.description,
          category: resource.category,
          fileType: resource.fileType,
          fileUrl: resource.fileUrl,
          accessTier: resource.accessTier,
          isPublished: resource.isPublished,
          downloadCount: resource.downloadCount,
        },
      });
      return Result.ok(undefined);
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async update(resource: Resource): Promise<Result<void, ResourceRepositoryError>> {
    try {
      await this.db.resource.update({
        where: { id: resource.id },
        data: {
          title: resource.title,
          description: resource.description,
          category: resource.category,
          fileType: resource.fileType,
          fileUrl: resource.fileUrl,
          accessTier: resource.accessTier,
          isPublished: resource.isPublished,
        },
      });
      return Result.ok(undefined);
    } catch (err: unknown) {
      if (isNotFoundError(err)) return Result.err({ kind: "not_found" });
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async delete(id: string): Promise<Result<void, ResourceRepositoryError>> {
    try {
      await this.db.resource.update({
        where: { id },
        data: { isPublished: false },
      });
      return Result.ok(undefined);
    } catch (err: unknown) {
      if (isNotFoundError(err)) return Result.err({ kind: "not_found" });
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async incrementDownloadCount(id: string): Promise<Result<void, ResourceRepositoryError>> {
    try {
      await this.db.resource.update({
        where: { id },
        data: { downloadCount: { increment: 1 } },
      });
      return Result.ok(undefined);
    } catch (err: unknown) {
      if (isNotFoundError(err)) return Result.err({ kind: "not_found" });
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  private mapRow(row: ResourceRow): Resource {
    if (!isValidResourceCategory(row.category)) {
      throw new Error(`Resource ${row.id} has an invalid persisted category: "${row.category}"`);
    }
    if (!isValidResourceFileType(row.fileType)) {
      throw new Error(`Resource ${row.id} has an invalid persisted fileType: "${row.fileType}"`);
    }
    if (!isValidResourceAccessTier(row.accessTier)) {
      throw new Error(
        `Resource ${row.id} has an invalid persisted accessTier: "${row.accessTier}"`,
      );
    }
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      category: row.category,
      fileType: row.fileType,
      fileUrl: row.fileUrl,
      accessTier: row.accessTier,
      isPublished: row.isPublished,
      downloadCount: row.downloadCount,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

function isNotFoundError(err: unknown): boolean {
  return (
    !!err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2025"
  );
}

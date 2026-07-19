/**
 * Prisma `ILiveClassRepository` adapter.
 * Stub — Prisma schema + adapter lands in a separate migration story.
 *
 * STORY-050c.
 */
import type { Result } from "@/domain/shared/Result";
import type {
  ILiveClassRepository,
  LiveClassRepositoryError,
} from "@/ports/repositories/ILiveClassRepository";
import type { LiveClass } from "@/domain/entities/LiveClass";

export class PrismaLiveClassRepository implements ILiveClassRepository {
  async listAll(): Promise<Result<LiveClass[], LiveClassRepositoryError>> {
    throw new Error("Not implemented: PrismaLiveClassRepository requires schema migration");
  }

  async findById(): Promise<Result<LiveClass | null, LiveClassRepositoryError>> {
    throw new Error("Not implemented: PrismaLiveClassRepository requires schema migration");
  }

  async create(): Promise<Result<void, LiveClassRepositoryError>> {
    throw new Error("Not implemented: PrismaLiveClassRepository requires schema migration");
  }

  async update(): Promise<Result<void, LiveClassRepositoryError>> {
    throw new Error("Not implemented: PrismaLiveClassRepository requires schema migration");
  }

  async delete(): Promise<Result<void, LiveClassRepositoryError>> {
    throw new Error("Not implemented: PrismaLiveClassRepository requires schema migration");
  }
}

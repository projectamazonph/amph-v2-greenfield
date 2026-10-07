/**
 * InMemoryCapstoneRepository — test fake (LEARN-043).
 */

import type {
  CapstoneQueryError,
  CapstoneRepoError,
  ICapstoneRepository,
} from "@/ports/repositories/ICapstoneRepository";
import type { CapstoneSubmission } from "@/domain/entities/CapstoneSubmission";
import { Result } from "@/domain/shared/Result";

export class InMemoryCapstoneRepository implements ICapstoneRepository {
  private rows: CapstoneSubmission[] = [];

  async create(
    submission: CapstoneSubmission,
  ): Promise<Result<CapstoneSubmission, CapstoneQueryError>> {
    this.rows.push(Object.freeze({ ...submission, artefactIds: [...submission.artefactIds] }));
    return Result.ok(submission);
  }

  async findById(id: string): Promise<Result<CapstoneSubmission | null, CapstoneQueryError>> {
    const found = this.rows.find((r) => r.id === id && r.deletedAt === null);
    return Result.ok(found ?? null);
  }

  async findLatestByUser(
    userId: string,
  ): Promise<Result<CapstoneSubmission | null, CapstoneQueryError>> {
    const found = this.rows
      .filter((r) => r.userId === userId && r.deletedAt === null)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
    return Result.ok(found ?? null);
  }

  async listByUser(
    userId: string,
  ): Promise<Result<readonly CapstoneSubmission[], CapstoneQueryError>> {
    const filtered = this.rows
      .filter((r) => r.userId === userId && r.deletedAt === null)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return Result.ok(filtered);
  }

  async listByStatus(
    status: import("@/domain/entities/CapstoneSubmission").CapstoneStatus,
  ): Promise<Result<readonly CapstoneSubmission[], CapstoneQueryError>> {
    const filtered = this.rows
      .filter((r) => r.status === status && r.deletedAt === null)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    return Result.ok(filtered);
  }

  async update(
    submission: CapstoneSubmission,
  ): Promise<Result<CapstoneSubmission, CapstoneRepoError>> {
    const index = this.rows.findIndex((r) => r.id === submission.id);
    if (index === -1) {
      return Result.err({ kind: "not_found" });
    }
    this.rows[index] = Object.freeze({ ...submission, artefactIds: [...submission.artefactIds] });
    return Result.ok(submission);
  }

  clear(): void {
    this.rows = [];
  }
}

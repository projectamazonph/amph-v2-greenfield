/**
 * InMemoryArtefactRepository — fast test adapter for IArtefactRepository.
 *
 * LEARN-033. Mirrors the Prisma adapter's postconditions (newest
 * first, soft-deleted rows excluded) so use-case tests catch the
 * same behaviour the portfolio page will read.
 */

import type {
  ArtefactFilter,
  ArtefactQueryError,
  ArtefactRepoError,
  IArtefactRepository,
} from "@/ports/repositories/IArtefactRepository";
import type { ArtefactKind, LearnerArtefact } from "@/domain/entities/LearnerArtefact";
import { Result } from "@/domain/shared/Result";

export class InMemoryArtefactRepository implements IArtefactRepository {
  private artefacts: LearnerArtefact[] = [];

  async create(artefact: LearnerArtefact): Promise<Result<LearnerArtefact, ArtefactQueryError>> {
    this.artefacts.push(Object.freeze({ ...artefact }));
    return Result.ok(artefact);
  }

  async findById(id: string): Promise<Result<LearnerArtefact | null, ArtefactQueryError>> {
    const found = this.artefacts.find((a) => a.id === id && a.deletedAt === null);
    return Result.ok(found ?? null);
  }

  async listByUser(
    userId: string,
    filter?: ArtefactFilter,
  ): Promise<Result<readonly LearnerArtefact[], ArtefactQueryError>> {
    const filtered = this.artefacts
      .filter((a) => a.userId === userId && a.deletedAt === null)
      .filter((a) => (filter?.kind === undefined ? true : a.kind === filter.kind))
      .filter((a) => (filter?.status === undefined ? true : a.status === filter.status))
      .filter((a) => (filter?.courseId === undefined ? true : a.courseId === filter.courseId))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return Result.ok(filtered);
  }

  async findLatestByUserAndKind(
    userId: string,
    kind: ArtefactKind,
  ): Promise<Result<LearnerArtefact | null, ArtefactQueryError>> {
    const found = this.artefacts
      .filter((a) => a.userId === userId && a.kind === kind && a.deletedAt === null)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
    return Result.ok(found ?? null);
  }

  async update(artefact: LearnerArtefact): Promise<Result<LearnerArtefact, ArtefactRepoError>> {
    const index = this.artefacts.findIndex((a) => a.id === artefact.id);
    if (index === -1) {
      return Result.err({ kind: "not_found" });
    }
    this.artefacts[index] = Object.freeze({ ...artefact });
    return Result.ok(artefact);
  }

  /** Remove all artefacts. Call between tests. */
  clear(): void {
    this.artefacts = [];
  }

  /** Pre-seed an artefact. */
  seed(artefact: LearnerArtefact): void {
    this.artefacts.push(Object.freeze({ ...artefact }));
  }
}

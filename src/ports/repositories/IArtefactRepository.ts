/**
 * IArtefactRepository — port for persisting learner artefacts.
 *
 * LEARN-033. Entities in, entities out: the use cases build and
 * transition the LearnerArtefact entity (create, revise, submit)
 * before persisting.
 *
 * Implementations: PrismaArtefactRepository (prod),
 * InMemoryArtefactRepository (tests).
 *
 * ADR-014: every port method returns Result<T, E>. No exceptions
 * across boundaries.
 */

import type { Result } from "@/domain/shared/Result";
import type {
  ArtefactKind,
  ArtefactStatus,
  LearnerArtefact,
} from "@/domain/entities/LearnerArtefact";

export type ArtefactRepoError = { kind: "not_found" } | { kind: "db_error"; message: string };

/**
 * Queries and creates never report `not_found`: a missing row is a
 * null. Only `update` can hit a missing id.
 */
export type ArtefactQueryError = { kind: "db_error"; message: string };

export interface ArtefactFilter {
  kind?: ArtefactKind;
  status?: ArtefactStatus;
  courseId?: string;
}

export interface IArtefactRepository {
  /**
   * Persist a new artefact.
   *
   * Errors: `db_error` — database failure, including a duplicate id.
   * Postconditions: the row is retrievable via findById with
   * identical fields.
   */
  create(artefact: LearnerArtefact): Promise<Result<LearnerArtefact, ArtefactQueryError>>;

  /**
   * Single artefact by id, or null when it does not exist.
   * Soft-deleted rows are excluded.
   */
  findById(id: string): Promise<Result<LearnerArtefact | null, ArtefactQueryError>>;

  /**
   * One student's artefacts, newest first. Soft-deleted rows are
   * excluded. The caller enforces ownership: only the owner (or an
   * admin reviewing a capstone, LEARN-044) may call this.
   */
  listByUser(
    userId: string,
    filter?: ArtefactFilter,
  ): Promise<Result<readonly LearnerArtefact[], ArtefactQueryError>>;

  /**
   * The student's newest artefact of a given kind, or null when the
   * student has none. Used by the portfolio page to surface the
   * latest evidence per kind (LEARN-035).
   */
  findLatestByUserAndKind(
    userId: string,
    kind: ArtefactKind,
  ): Promise<Result<LearnerArtefact | null, ArtefactQueryError>>;

  /**
   * Persist transitions on an existing artefact (revise, submit,
   * soft delete).
   * Errors: `not_found` — no artefact with this id exists.
   */
  update(artefact: LearnerArtefact): Promise<Result<LearnerArtefact, ArtefactRepoError>>;
}

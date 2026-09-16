/**
 * ListStudentArtefacts — owner-scoped artefact reads (LEARN-033).
 *
 * The caller proves ownership: the use case lists only rows whose
 * `userId` matches the caller's id. An admin path (LEARN-044
 * reviewer queue) is a separate use case with its own audit
 * trail, not a flag on this one.
 */

import { Result } from "@/domain/shared/Result";
import type {
  ArtefactKind,
  ArtefactStatus,
  LearnerArtefact,
} from "@/domain/entities/LearnerArtefact";
import type { IArtefactRepository } from "@/ports/repositories/IArtefactRepository";

export interface ListStudentArtefactsInput {
  actorId: string;
  kind?: ArtefactKind;
  status?: ArtefactStatus;
  courseId?: string;
}

export type ListStudentArtefactsError = { kind: "db_error"; message: string };

export interface ListStudentArtefactsDeps {
  artefactRepo: IArtefactRepository;
}

export class ListStudentArtefacts {
  constructor(private readonly deps: ListStudentArtefactsDeps) {}

  async execute(
    input: ListStudentArtefactsInput,
  ): Promise<Result<readonly LearnerArtefact[], ListStudentArtefactsError>> {
    const listed = await this.deps.artefactRepo.listByUser(input.actorId, {
      ...(input.kind !== undefined ? { kind: input.kind } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.courseId !== undefined ? { courseId: input.courseId } : {}),
    });
    if (!listed.ok) {
      return Result.err({ kind: "db_error", message: listed.error.message });
    }
    return Result.ok(listed.value);
  }
}

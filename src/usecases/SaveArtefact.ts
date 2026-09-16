/**
 * SaveArtefact — owner creates or revises a draft artefact (LEARN-033).
 *
 * Creates a new DRAFT when `artefactId` is absent; revises the
 * existing DRAFT when `artefactId` names a draft the caller owns.
 * Submitted artefacts are locked (revise path rejects them in the
 * domain); the caller learns this as `invalid_status`, not as a
 * silent overwrite.
 */

import { Result } from "@/domain/shared/Result";
import {
  createArtefact,
  reviseArtefact,
  type ArtefactKind,
  type CreateArtefactError,
  type LearnerArtefact,
  type ReviseArtefactError,
} from "@/domain/entities/LearnerArtefact";
import type { IArtefactRepository } from "@/ports/repositories/IArtefactRepository";
import type { IdGenerator } from "@/ports/system/IdGenerator";
import type { Clock } from "@/ports/system/Clock";

export interface SaveArtefactInput {
  actorId: string;
  /** Absent for create; present for revise. */
  artefactId?: string;
  courseId: string | null;
  kind: ArtefactKind;
  title: string;
  scenarioRef: string | null;
  payload: { rationale: string; scenarioRef?: string; fields?: Record<string, string> };
}

export type SaveArtefactError =
  | CreateArtefactError
  | ReviseArtefactError
  | { kind: "not_found" }
  | { kind: "db_error"; message: string };

export interface SaveArtefactDeps {
  artefactRepo: IArtefactRepository;
  idGen: IdGenerator;
  clock: Clock;
}

export class SaveArtefact {
  constructor(private readonly deps: SaveArtefactDeps) {}

  async execute(input: SaveArtefactInput): Promise<Result<LearnerArtefact, SaveArtefactError>> {
    const now = this.deps.clock.now();

    if (input.artefactId === undefined) {
      const built = createArtefact({
        id: this.deps.idGen.newId(),
        userId: input.actorId,
        courseId: input.courseId,
        kind: input.kind,
        title: input.title,
        scenarioRef: input.scenarioRef,
        payload: input.payload,
        createdById: input.actorId,
        createdAt: now,
      });
      if (!built.ok) return built;
      const saved = await this.deps.artefactRepo.create(built.value);
      if (!saved.ok) {
        return Result.err({ kind: "db_error", message: saved.error.message });
      }
      return Result.ok(saved.value);
    }

    const existing = await this.deps.artefactRepo.findById(input.artefactId);
    if (!existing.ok) {
      return Result.err({ kind: "db_error", message: existing.error.message });
    }
    if (!existing.value) {
      return Result.err({ kind: "not_found" });
    }
    const revised = reviseArtefact(existing.value, {
      revisedById: input.actorId,
      title: input.title,
      payload: input.payload,
      revisedAt: now,
    });
    if (!revised.ok) return revised;
    const saved = await this.deps.artefactRepo.update(revised.value);
    if (!saved.ok) {
      if (saved.error.kind === "not_found") return Result.err({ kind: "not_found" });
      return Result.err({ kind: "db_error", message: saved.error.message });
    }
    return Result.ok(saved.value);
  }
}

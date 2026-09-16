/**
 * SubmitArtefact — owner locks a DRAFT for review (LEARN-033).
 *
 * The domain rejects non-owners and non-drafts. The use case maps
 * those to typed errors and persists the locked row. Reviewer
 * actions (LEARN-044) read submitted rows; they never mutate them
 * through this path.
 */

import { Result } from "@/domain/shared/Result";
import {
  submitArtefact,
  type LearnerArtefact,
  type SubmitArtefactError,
} from "@/domain/entities/LearnerArtefact";
import type { IArtefactRepository } from "@/ports/repositories/IArtefactRepository";
import type { Clock } from "@/ports/system/Clock";

export interface SubmitArtefactInput {
  actorId: string;
  artefactId: string;
}

export type SubmitArtefactUseCaseError =
  SubmitArtefactError | { kind: "not_found" } | { kind: "db_error"; message: string };

export interface SubmitArtefactDeps {
  artefactRepo: IArtefactRepository;
  clock: Clock;
}

export class SubmitArtefact {
  constructor(private readonly deps: SubmitArtefactDeps) {}

  async execute(
    input: SubmitArtefactInput,
  ): Promise<Result<LearnerArtefact, SubmitArtefactUseCaseError>> {
    const existing = await this.deps.artefactRepo.findById(input.artefactId);
    if (!existing.ok) {
      return Result.err({ kind: "db_error", message: existing.error.message });
    }
    if (!existing.value) {
      return Result.err({ kind: "not_found" });
    }
    const locked = submitArtefact(existing.value, {
      submittedById: input.actorId,
      submittedAt: this.deps.clock.now(),
    });
    if (!locked.ok) return locked;
    const saved = await this.deps.artefactRepo.update(locked.value);
    if (!saved.ok) {
      if (saved.error.kind === "not_found") return Result.err({ kind: "not_found" });
      return Result.err({ kind: "db_error", message: saved.error.message });
    }
    return Result.ok(saved.value);
  }
}

/**
 * SubmitCapstone — owner submits the capstone for review (LEARN-043).
 *
 * Finds or creates the learner's DRAFT row, checks readiness via
 * checkCapstoneReadiness over the caller's SUBMITTED artefacts, and
 * persists the SUBMITTED transition. A submission with missing
 * kinds is rejected as not_ready with the missing list — the page
 * renders exactly that list.
 */

import { Result } from "@/domain/shared/Result";
import {
  createCapstone,
  submitCapstone,
  type CapstoneSubmission,
  type CreateCapstoneError,
  type SubmitCapstoneError,
} from "@/domain/entities/CapstoneSubmission";
import { checkKindReadiness } from "@/domain/services/Capstone";
import type { ICapstoneRepository } from "@/ports/repositories/ICapstoneRepository";
import type { IArtefactRepository } from "@/ports/repositories/IArtefactRepository";
import type { IdGenerator } from "@/ports/system/IdGenerator";
import type { Clock } from "@/ports/system/Clock";

export interface SubmitCapstoneInput {
  actorId: string;
  courseId: string | null;
  /**
   * Required artefact kinds, loaded from the capstone manifest by
   * the caller (server action). Passed in so the use case never
   * imports a filesystem module (dependency-direction rule).
   */
  requiredKinds: readonly string[];
}

export type SubmitCapstoneUseCaseError =
  | CreateCapstoneError
  | SubmitCapstoneError
  | { kind: "not_found" }
  | { kind: "db_error"; message: string };

export interface SubmitCapstoneDeps {
  capstoneRepo: ICapstoneRepository;
  artefactRepo: IArtefactRepository;
  idGen: IdGenerator;
  clock: Clock;
}

export class SubmitCapstone {
  constructor(private readonly deps: SubmitCapstoneDeps) {}

  async execute(
    input: SubmitCapstoneInput,
  ): Promise<Result<CapstoneSubmission, SubmitCapstoneUseCaseError>> {
    const artefacts = await this.deps.artefactRepo.listByUser(input.actorId, {
      status: "SUBMITTED",
    });
    if (!artefacts.ok) {
      return Result.err({ kind: "db_error", message: artefacts.error.message });
    }
    const readiness = checkKindReadiness(
      input.requiredKinds,
      artefacts.value.map((a) => a.kind),
    );

    let row = await this.deps.capstoneRepo.findLatestByUser(input.actorId);
    if (!row.ok) {
      return Result.err({ kind: "db_error", message: row.error.message });
    }
    let submission = row.value;
    if (!submission || submission.status === "PASSED") {
      const created = createCapstone({
        id: this.deps.idGen.newId(),
        userId: input.actorId,
        courseId: input.courseId,
        createdById: input.actorId,
        createdAt: this.deps.clock.now(),
      });
      if (!created.ok) return created;
      const saved = await this.deps.capstoneRepo.create(created.value);
      if (!saved.ok) {
        return Result.err({ kind: "db_error", message: saved.error.message });
      }
      submission = saved.value;
    }

    const submitted = submitCapstone(submission, {
      submittedById: input.actorId,
      artefactIds: artefacts.value.map((a) => a.id),
      missingKinds: readiness.missingKinds,
      submittedAt: this.deps.clock.now(),
    });
    if (!submitted.ok) return submitted;
    const saved = await this.deps.capstoneRepo.update(submitted.value);
    if (!saved.ok) {
      if (saved.error.kind === "not_found") return Result.err({ kind: "not_found" });
      return Result.err({ kind: "db_error", message: saved.error.message });
    }
    return Result.ok(saved.value);
  }
}

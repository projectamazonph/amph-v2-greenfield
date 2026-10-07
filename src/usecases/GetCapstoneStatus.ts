/**
 * GetCapstoneStatus — owner reads readiness + latest row (LEARN-043).
 *
 * Joins checkCapstoneReadiness over the caller's SUBMITTED artefacts
 * with their latest submission row. The /capstone page renders
 * exactly this shape: brief progress, missing list, submit CTA
 * visibility, and current state.
 */

import { Result } from "@/domain/shared/Result";
import { checkKindReadiness } from "@/domain/services/Capstone";
import type { CapstoneSubmission } from "@/domain/entities/CapstoneSubmission";
import type { ICapstoneRepository } from "@/ports/repositories/ICapstoneRepository";
import type { IArtefactRepository } from "@/ports/repositories/IArtefactRepository";

export interface CapstoneStatusView {
  readonly submission: CapstoneSubmission | null;
  readonly ready: boolean;
  readonly requiredKinds: readonly string[];
  readonly submittedKinds: readonly string[];
  readonly missingKinds: readonly string[];
}

export type GetCapstoneStatusError = { kind: "db_error"; message: string };

export interface GetCapstoneStatusDeps {
  capstoneRepo: ICapstoneRepository;
  artefactRepo: IArtefactRepository;
}

export class GetCapstoneStatus {
  constructor(private readonly deps: GetCapstoneStatusDeps) {}

  async execute(input: {
    actorId: string;
    requiredKinds: readonly string[];
  }): Promise<Result<CapstoneStatusView, GetCapstoneStatusError>> {
    const [artefacts, row] = await Promise.all([
      this.deps.artefactRepo.listByUser(input.actorId, { status: "SUBMITTED" }),
      this.deps.capstoneRepo.findLatestByUser(input.actorId),
    ]);
    if (!artefacts.ok) {
      return Result.err({ kind: "db_error", message: artefacts.error.message });
    }
    if (!row.ok) {
      return Result.err({ kind: "db_error", message: row.error.message });
    }
    const readiness = checkKindReadiness(
      input.requiredKinds,
      artefacts.value.map((a) => a.kind),
    );
    return Result.ok({
      submission: row.value,
      ready: readiness.ready,
      requiredKinds: readiness.requiredKinds,
      submittedKinds: readiness.submittedKinds,
      missingKinds: readiness.missingKinds,
    });
  }
}

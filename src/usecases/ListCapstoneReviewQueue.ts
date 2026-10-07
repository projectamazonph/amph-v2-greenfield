/**
 * ListCapstoneReviewQueue — admin reviewer queue (LEARN-044).
 *
 * Lists every SUBMITTED capstone oldest-first. Authorisation is
 * delegated to the caller (`requireAdmin` in the route/action);
 * the use case takes no actor for reads. Every reviewer mutation
 * (return, pass) audits separately in its own use case.
 */

import { Result } from "@/domain/shared/Result";
import type { CapstoneSubmission } from "@/domain/entities/CapstoneSubmission";
import type { ICapstoneRepository } from "@/ports/repositories/ICapstoneRepository";

export type ListCapstoneReviewQueueError = { kind: "db_error"; message: string };

export interface ListCapstoneReviewQueueDeps {
  capstoneRepo: ICapstoneRepository;
}

export class ListCapstoneReviewQueue {
  constructor(private readonly deps: ListCapstoneReviewQueueDeps) {}

  async execute(): Promise<Result<readonly CapstoneSubmission[], ListCapstoneReviewQueueError>> {
    const listed = await this.deps.capstoneRepo.listByStatus("SUBMITTED");
    if (!listed.ok) {
      return Result.err({ kind: "db_error", message: listed.error.message });
    }
    return Result.ok(listed.value);
  }
}

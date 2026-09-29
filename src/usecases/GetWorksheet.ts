/**
 * GetWorksheet — read the per-student worksheet rows for Module 1.
 *
 * STORY-163. Returns every row the student has touched, up to five
 * (one per lesson). Rows are returned in the order the port gives them;
 * the React side sorts them by lessonSlug if a specific order matters.
 *
 * The use case is a thin pass-through: the port is responsible for
 * shape, the use case layer adds nothing. Read-only; no audit log row
 * is emitted (per AGENTS.md "Every admin mutation logs" — reads are
 * not mutations).
 */

import type { Result } from "@/domain/shared/Result";
import type { WorksheetEntry } from "@/domain/artifacts/worksheetEntry";
import type { WorksheetRepository, WorksheetError } from "@/ports/repositories/WorksheetRepository";

export type GetWorksheetError = WorksheetError;

export interface GetWorksheetDeps {
  worksheetRepo: WorksheetRepository;
}

export class GetWorksheet {
  constructor(private readonly deps: GetWorksheetDeps) {}

  async execute(input: {
    studentId: string;
  }): Promise<Result<readonly WorksheetEntry[], GetWorksheetError>> {
    return this.deps.worksheetRepo.findByStudent(input.studentId);
  }
}

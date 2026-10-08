/**
 * GetWorksheet — read every per-H2 worksheet value for one student in
 * one lesson.
 *
 * Pass-through to the repository. Returns the sparse list of
 * WorksheetFieldValue rows; the renderer joins them by (h2Anchor,
 * fieldKey) to render one input per field.
 *
 * No actor check: any caller with the studentId may read; the route
 * layer enforces that callers can only see their own rows. There is
 * no admin review path for worksheet entries.
 */

import type { Result } from "@/domain/shared/Result";
import type { WorksheetFieldValue, WorksheetLessonSlug } from "@/domain/artifacts/worksheetEntry";
import type {
  IWorksheetRepository,
  WorksheetQueryError,
} from "@/ports/repositories/IWorksheetRepository";

export interface GetWorksheetInput {
  readonly studentId: string;
  readonly lessonSlug: WorksheetLessonSlug;
}

export type GetWorksheetResult = Result<readonly WorksheetFieldValue[], WorksheetQueryError>;

export interface GetWorksheetDeps {
  worksheetRepo: IWorksheetRepository;
}

export class GetWorksheet {
  constructor(private readonly deps: GetWorksheetDeps) {}

  async execute(input: GetWorksheetInput): Promise<GetWorksheetResult> {
    return this.deps.worksheetRepo.findByStudentAndLesson(input.studentId, input.lessonSlug);
  }
}

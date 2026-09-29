/**
 * InMemoryWorksheetRepository — test fake. STORY-163.
 *
 * Lives at src/infra/db/inmemory/ to match InMemorySentReminderRepository,
 * InMemoryEmailVerificationRepository, InMemoryPasswordResetRepository.
 * Tests that need the production shape wire the Prisma adapter via
 * buildTestContainer(); tests that exercise use-case logic in isolation
 * can use this fake directly without touching the container.
 *
 * Storage shape: Map<studentId::lessonSlug, WorksheetEntry>. One entry
 * per (student, lesson); upsert overwrites; findByStudent returns every
 * live row for the student (we do not simulate deletedAt).
 */

import { Result } from "@/domain/shared/Result";
import type {
  WorksheetEntry,
  WorksheetLessonSlug,
  WorksheetValues,
} from "@/domain/artifacts/worksheetEntry";
import type {
  UpsertWorksheetArgs,
  WorksheetError,
  WorksheetRepository,
} from "@/ports/repositories/WorksheetRepository";

export class InMemoryWorksheetRepository implements WorksheetRepository {
  private rows = new Map<string, WorksheetEntry>();

  private key(studentId: string, lessonSlug: WorksheetLessonSlug): string {
    return `${studentId}::${lessonSlug}`;
  }

  async findByStudent(
    studentId: string,
  ): Promise<Result<readonly WorksheetEntry[], WorksheetError>> {
    const out: WorksheetEntry[] = [];
    for (const [k, entry] of this.rows) {
      if (k.startsWith(`${studentId}::`)) out.push(entry);
    }
    return Result.ok(out);
  }

  async upsert(args: UpsertWorksheetArgs): Promise<Result<{ savedAt: Date }, WorksheetError>> {
    const entry: WorksheetEntry = {
      studentId: args.studentId,
      lessonSlug: args.lessonSlug,
      values: args.values,
      updatedAt: args.updatedAt,
    };
    this.rows.set(this.key(args.studentId, args.lessonSlug), entry);
    return Result.ok({ savedAt: args.updatedAt });
  }
}

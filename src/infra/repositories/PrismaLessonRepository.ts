/**
 * PrismaLessonRepository — production Prisma adapter for ILessonRepository.
 *
 * STORY-048c. STUB: throws on every method.
 *
 * The Prisma Lesson table doesn't exist yet. When the schema
 * migration lands, this stub gets a real implementation that
 * mirrors the InMemoryLessonRepository (same contract).
 *
 * Until then, the prod container falls back to InMemoryLessonRepository
 * (see container.ts).
 */

import type { Result } from "@/domain/shared/Result";
import type { Lesson } from "@/domain/entities/Lesson";
import type {
  ILessonRepository,
  LessonError,
} from "@/ports/repositories/ILessonRepository";

function notImplemented(): never {
  throw new Error(
    "PrismaLessonRepository is not implemented yet. " +
      "The Prisma Lesson schema migration is a follow-up. " +
      "The prod container falls back to InMemoryLessonRepository.",
  );
}

export class PrismaLessonRepository implements ILessonRepository {
  async findByModuleId(
    _moduleId: string,
  ): Promise<Result<readonly Lesson[], LessonError>> {
    notImplemented();
  }
  async findById(_id: string): Promise<Result<Lesson, LessonError>> {
    notImplemented();
  }
  async create(_lesson: Lesson): Promise<Result<Lesson, LessonError>> {
    notImplemented();
  }
  async update(_lesson: Lesson): Promise<Result<Lesson, LessonError>> {
    notImplemented();
  }
  async delete(_id: string): Promise<Result<void, LessonError>> {
    notImplemented();
  }
  async reorder(
    _moduleId: string,
    _lessonIds: readonly string[],
  ): Promise<Result<readonly Lesson[], LessonError>> {
    notImplemented();
  }
}

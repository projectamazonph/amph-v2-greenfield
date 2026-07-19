/**
 * CreateLesson — create a new lesson in a module.
 *
 * STORY-048c. Auto-assigns displayOrder = count + 1.
 */

import { Result } from "@/domain/shared/Result";
import { createLesson, type Lesson, type LessonType, type LessonContent } from "@/domain/entities/Lesson";
import type { ILessonRepository, LessonError } from "@/ports/repositories/ILessonRepository";
import type { IdGenerator } from "@/ports/system/IdGenerator";
import type { Clock } from "@/ports/system/Clock";

export interface CreateLessonInput {
  moduleId: string;
  title: string;
  type: LessonType;
  content: LessonContent;
}

export type CreateLessonError =
  | { kind: "invalid_input"; message: string }
  | LessonError;

export type CreateLessonResult = Result<
  { lesson: Lesson },
  CreateLessonError
>;

export interface CreateLessonDeps {
  lessonRepo: ILessonRepository;
  idGen: IdGenerator;
  clock: Clock;
}

export class CreateLesson {
  constructor(private readonly deps: CreateLessonDeps) {}

  async execute(input: CreateLessonInput): Promise<CreateLessonResult> {
    if (!input.title.trim()) {
      return Result.err({ kind: "invalid_input", message: "title is required" });
    }

    const existing = await this.deps.lessonRepo.findByModuleId(input.moduleId);
    if (!existing.ok) {
      return Result.err(existing.error);
    }
    const nextOrder = existing.value.length + 1;

    const id = this.deps.idGen.newId();
    const now = this.deps.clock.now();
    const buildResult = createLesson({
      id,
      moduleId: input.moduleId,
      title: input.title,
      type: input.type,
      content: input.content,
      displayOrder: nextOrder,
      createdAt: now,
      updatedAt: now,
    });
    if (!buildResult.ok) {
      return Result.err({ kind: "invalid_input", message: buildResult.error.message });
    }
    const lesson = buildResult.value;

    const persistResult = await this.deps.lessonRepo.create(lesson);
    if (!persistResult.ok) {
      return Result.err(persistResult.error);
    }
    return Result.ok({ lesson: persistResult.value });
  }
}

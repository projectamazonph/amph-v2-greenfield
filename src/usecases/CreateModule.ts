/**
 * CreateModule — create a new module in a course.
 *
 * STORY-048b.
 *
 * Flow:
 *  1. Count existing modules in the course
 *  2. Compute new displayOrder = count + 1
 *  3. Build the Module via the entity factory
 *  4. Persist via the repo
 *
 * Note: the course's existence is NOT validated here. The use case
 * trusts the caller (the admin server action) to have verified
 * that the course exists. If the caller passes a non-existent
 * courseId, the module is still created (orphaned) — a known gap
 * documented in the story's Pitfalls. A future story can add a
 * "verify course exists" check via courseRepo.findById.
 */

import { Result } from "@/domain/shared/Result";
import { createModule, type Module } from "@/domain/entities/Module";
import type { IModuleRepository, ModuleError } from "@/ports/repositories/IModuleRepository";
import type { IdGenerator } from "@/ports/system/IdGenerator";
import type { Clock } from "@/ports/system/Clock";

export interface CreateModuleInput {
  courseId: string;
  title: string;
}

export type CreateModuleError =
  | { kind: "invalid_title" }
  | ModuleError;

export type CreateModuleResult = Result<
  { module: Module },
  CreateModuleError
>;

export interface CreateModuleDeps {
  moduleRepo: IModuleRepository;
  idGen: IdGenerator;
  clock: Clock;
}

export class CreateModule {
  constructor(private readonly deps: CreateModuleDeps) {}

  async execute(input: CreateModuleInput): Promise<CreateModuleResult> {
    // Validate title via the entity factory (it'll catch empty/whitespace)
    if (!input.title.trim()) {
      return Result.err({ kind: "invalid_title" });
    }

    // 1. Count existing modules
    const existing = await this.deps.moduleRepo.findByCourseId(input.courseId);
    if (!existing.ok) {
      return Result.err(existing.error);
    }
    const nextOrder = existing.value.length + 1;

    // 2. Build the module entity
    const id = this.deps.idGen.newId();
    const now = this.deps.clock.now();
    const buildResult = createModule({
      id,
      courseId: input.courseId,
      title: input.title,
      displayOrder: nextOrder,
      createdAt: now,
      updatedAt: now,
    });
    if (!buildResult.ok) {
      return Result.err({ kind: "invalid_title" });
    }
    const module = buildResult.value;

    // 3. Persist
    const persistResult = await this.deps.moduleRepo.create(module);
    if (!persistResult.ok) {
      return Result.err(persistResult.error);
    }
    return Result.ok({ module: persistResult.value });
  }
}

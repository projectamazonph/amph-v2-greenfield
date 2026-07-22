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
import { RecordAuditLog } from "@/usecases/RecordAuditLog";

export interface CreateModuleInput {
  courseId: string;
  title: string;
  actorId: string;
}

export type CreateModuleError = { kind: "invalid_title" } | ModuleError;

export type CreateModuleResult = Result<{ module: Module }, CreateModuleError>;

export interface CreateModuleDeps {
  moduleRepo: IModuleRepository;
  idGen: IdGenerator;
  clock: Clock;
  recordAuditLog: RecordAuditLog;
}

export class CreateModule {
  constructor(private readonly deps: CreateModuleDeps) {}

  async execute(input: CreateModuleInput): Promise<CreateModuleResult> {
    // Validate title via the entity factory (it'll catch empty/whitespace)
    if (!input.title.trim()) {
      void this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action: "module.create_failed",
        targetId: input.courseId,
        targetType: "module",
        metadata: { error: "invalid_title" },
      });
      return Result.err({ kind: "invalid_title" });
    }

    const existing = await this.deps.moduleRepo.findByCourseId(input.courseId);
    if (!existing.ok) {
      void this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action: "module.create_failed",
        targetId: input.courseId,
        targetType: "module",
        metadata: { error: existing.error.kind },
      });
      return Result.err(existing.error);
    }
    const nextOrder = existing.value.length + 1;

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
      void this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action: "module.create_failed",
        targetId: id,
        targetType: "module",
        metadata: { error: "invalid_title" },
      });
      return Result.err({ kind: "invalid_title" });
    }
    const created = buildResult.value;

    const persistResult = await this.deps.moduleRepo.create(created);
    if (!persistResult.ok) {
      void this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action: "module.create_failed",
        targetId: id,
        targetType: "module",
        metadata: { error: persistResult.error.kind },
      });
      return Result.err(persistResult.error);
    }

    void this.deps.recordAuditLog.execute({
      actorId: input.actorId,
      action: "module.created",
      targetId: persistResult.value.id,
      targetType: "module",
      metadata: { courseId: input.courseId, title: input.title },
    });

    return Result.ok({ module: persistResult.value });
  }
}

/**
 * AdminListModules — list modules for a course.
 *
 * STORY-048b. Thin wrapper over the repo's findByCourseId.
 */

import { Result } from "@/domain/shared/Result";
import type { Module } from "@/domain/entities/Module";
import type { IModuleRepository, ModuleError } from "@/ports/repositories/IModuleRepository";

export interface AdminListModulesInput {
  courseId: string;
}

export type AdminListModulesResult = Result<
  { modules: readonly Module[] },
  ModuleError
>;

export interface AdminListModulesDeps {
  moduleRepo: IModuleRepository;
}

export class AdminListModules {
  constructor(private readonly deps: AdminListModulesDeps) {}

  async execute(
    input: AdminListModulesInput,
  ): Promise<AdminListModulesResult> {
    const r = await this.deps.moduleRepo.findByCourseId(input.courseId);
    if (!r.ok) {
      return Result.err(r.error);
    }
    return Result.ok({ modules: r.value });
  }
}

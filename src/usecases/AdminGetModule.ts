/**
 * AdminGetModule — fetch a module by id (admin view).
 *
 * STORY-048b. Thin wrapper. Returns the module if found.
 */

import { Result } from "@/domain/shared/Result";
import type { Module } from "@/domain/entities/Module";
import type { IModuleRepository, ModuleError } from "@/ports/repositories/IModuleRepository";

export interface AdminGetModuleInput {
  moduleId: string;
}

export type AdminGetModuleError =
  | { kind: "module_not_found" }
  | ModuleError;

export type AdminGetModuleResult = Result<
  { module: Module },
  AdminGetModuleError
>;

export interface AdminGetModuleDeps {
  moduleRepo: IModuleRepository;
}

export class AdminGetModule {
  constructor(private readonly deps: AdminGetModuleDeps) {}

  async execute(input: AdminGetModuleInput): Promise<AdminGetModuleResult> {
    const r = await this.deps.moduleRepo.findById(input.moduleId);
    if (!r.ok) {
      if (r.error.kind === "not_found") {
        return Result.err({ kind: "module_not_found" });
      }
      return Result.err(r.error);
    }
    return Result.ok({ module: r.value });
  }
}

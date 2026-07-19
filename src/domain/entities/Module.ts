/**
 * Module — a course module (top-level unit of organization within a
 * course). Each module has a `title` and a `displayOrder`. Modules
 * own lessons (STORY-048c), but the lesson link is not modeled here
 * — modules are fetched independently of lessons for the admin UI.
 *
 * STORY-048b. STORY-048a embedded modules in `Course.curriculum` as
 * a JSON blob; this entity replaces that for the admin surface. The
 * public catalog migration is a follow-up.
 *
 * Domain rules:
 * - title must be non-empty after trim
 * - displayOrder is a positive integer (1-indexed)
 * - courseId must be non-empty
 * - id must be non-empty
 */

import { Result } from "@/domain/shared/Result";

export interface Module {
  readonly id: string;
  readonly courseId: string;
  readonly title: string;
  readonly displayOrder: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export type ModuleError =
  | { kind: "invalid_input"; message: string };

// ── Factory ────────────────────────────────────────────────────────────

export interface CreateModuleParams {
  id: string;
  courseId: string;
  title: string;
  displayOrder: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export function createModule(
  params: CreateModuleParams,
): Result<Module, ModuleError> {
  if (!params.id.trim()) {
    return Result.err({ kind: "invalid_input", message: "Module id is required" });
  }
  if (!params.courseId.trim()) {
    return Result.err({ kind: "invalid_input", message: "Course id is required" });
  }
  if (!params.title.trim()) {
    return Result.err({ kind: "invalid_input", message: "Module title is required" });
  }
  if (!Number.isInteger(params.displayOrder) || params.displayOrder < 1) {
    return Result.err({
      kind: "invalid_input",
      message: "displayOrder must be a positive integer",
    });
  }
  const now = new Date();
  return Result.ok({
    id: params.id.trim(),
    courseId: params.courseId.trim(),
    title: params.title.trim(),
    displayOrder: params.displayOrder,
    createdAt: params.createdAt ?? now,
    updatedAt: params.updatedAt ?? now,
  });
}

// ── Update factory ─────────────────────────────────────────────────────

export interface UpdateModulePatch {
  title?: string;
  displayOrder?: number;
}

export function updateModule(
  module: Module,
  patch: UpdateModulePatch,
): Result<Module, ModuleError> {
  return createModule({
    id: module.id,
    courseId: module.courseId,
    title: patch.title ?? module.title,
    displayOrder: patch.displayOrder ?? module.displayOrder,
    createdAt: module.createdAt,
    updatedAt: new Date(),
  });
}

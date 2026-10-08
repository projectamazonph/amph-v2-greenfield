/**
 * GetModuleDependencyMatrix — builds the module-to-module dependency matrix for admin.
 *
 * Reads:
 * 1. Courses from CourseRepository
 * 2. Modules from IModuleRepository
 * 3. Prerequisite rules from IPrerequisiteRepository
 * 4. Lessons from ILessonRepository (or Course curriculum) for rule labels
 *
 * Constructs an N×N matrix representing prerequisite relationships between modules:
 * - Row M_A, Col M_B = "PREREQUISITE" if M_A's course is required for M_B's course
 * - Row M_A, Col M_B = "DEPENDENT" if M_A's course requires M_B's course
 * - Row M_A, Col M_B = "SELF" if M_A is M_B
 * - Row M_A, Col M_B = "NONE" otherwise
 */

import { Result } from "@/domain/shared/Result";
import type { CourseRepository } from "@/ports/repositories/CourseRepository";
import type { IModuleRepository } from "@/ports/repositories/IModuleRepository";
import type { IPrerequisiteRepository } from "@/ports/repositories/IPrerequisiteRepository";
import type { ILessonRepository } from "@/ports/repositories/ILessonRepository";

export interface GetModuleDependencyMatrixInput {
  courseId?: string; // Optional course ID to focus/highlight
  range?: "core" | "all"; // "core" = core 9x9, "all" = all modules
}

export interface ModuleMatrixItem {
  id: string;
  title: string;
  code: string; // e.g. "M1", "M2"
  displayOrder: number;
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  courseTier: string;
}

export type DependencyCellType = "PREREQUISITE" | "DEPENDENT" | "SELF" | "NONE";

export interface DependencyCell {
  rowModuleId: string;
  colModuleId: string;
  cellType: DependencyCellType;
  ruleSummary: string | null;
  requiresCourseTitle?: string;
  requiresLessonTitle?: string;
}

export interface ModuleDependencyMatrixData {
  modules: readonly ModuleMatrixItem[];
  matrix: readonly (readonly DependencyCell[])[];
  hasPrerequisites: boolean;
  totalPrerequisiteRules: number;
}

export type GetModuleDependencyMatrixError = {
  kind: "db_error";
  message: string;
};

export type GetModuleDependencyMatrixResult = Result<
  ModuleDependencyMatrixData,
  GetModuleDependencyMatrixError
>;

export interface GetModuleDependencyMatrixDeps {
  courseRepo: CourseRepository;
  moduleRepo: IModuleRepository;
  prerequisiteRepo: IPrerequisiteRepository;
  lessonRepo?: ILessonRepository;
}

export class GetModuleDependencyMatrix {
  constructor(private readonly deps: GetModuleDependencyMatrixDeps) {}

  async execute(
    input: GetModuleDependencyMatrixInput = {},
  ): Promise<GetModuleDependencyMatrixResult> {
    // 1. Fetch all courses
    const coursesRes = await this.deps.courseRepo.listAll();
    if (!coursesRes.ok) {
      return Result.err({ kind: "db_error", message: "Failed to load courses" });
    }
    const courses = [...coursesRes.value].sort(
      (a, b) => a.displayOrder - b.displayOrder || a.createdAt.getTime() - b.createdAt.getTime(),
    );

    // 2. Fetch modules per course
    const moduleItems: ModuleMatrixItem[] = [];
    const courseById = new Map(courses.map((c) => [c.id, c]));

    let globalModuleIndex = 1;
    for (const course of courses) {
      const modulesRes = await this.deps.moduleRepo.findByCourseId(course.id);
      if (modulesRes.ok) {
        const mods = [...modulesRes.value].sort((a, b) => a.displayOrder - b.displayOrder);
        for (const mod of mods) {
          const code = `M${globalModuleIndex}`;
          globalModuleIndex++;
          moduleItems.push({
            id: mod.id,
            title: mod.title,
            code,
            displayOrder: mod.displayOrder,
            courseId: course.id,
            courseTitle: course.title,
            courseSlug: course.slug,
            courseTier: course.courseTier,
          });
        }
      }
    }

    // 3. Fetch all prerequisite rules
    const prereqRes = await this.deps.prerequisiteRepo.listAll();
    if (!prereqRes.ok) {
      return Result.err({ kind: "db_error", message: "Failed to load prerequisite rules" });
    }
    const rules = prereqRes.value;

    // Filter range if specified (core = 9x9, all = full list)
    const range = input.range ?? "all";
    let filteredModules = moduleItems;
    if (range === "core" && moduleItems.length >= 9) {
      filteredModules = moduleItems.slice(0, 9);
    }

    // Map rules by target courseId + requiresCourseId
    const ruleByTargetAndReq = new Map<string, (typeof rules)[number]>();
    for (const rule of rules) {
      const key = `${rule.courseId}:${rule.requiresCourseId}`;
      ruleByTargetAndReq.set(key, rule);
    }

    // Resolve lesson titles if lessonRepo provided
    const lessonTitles = new Map<string, string>();
    if (this.deps.lessonRepo) {
      for (const rule of rules) {
        if (rule.requiresLessonId && !lessonTitles.has(rule.requiresLessonId)) {
          const lRes = await this.deps.lessonRepo.findById(rule.requiresLessonId);
          if (lRes.ok) {
            lessonTitles.set(rule.requiresLessonId, lRes.value.title);
          }
        }
      }
    }

    // Build N x N matrix
    const matrix: DependencyCell[][] = [];

    for (let r = 0; r < filteredModules.length; r++) {
      const rowMod = filteredModules[r];
      if (!rowMod) continue;
      const rowCells: DependencyCell[] = [];

      for (let c = 0; c < filteredModules.length; c++) {
        const colMod = filteredModules[c];
        if (!colMod) continue;

        if (rowMod.id === colMod.id) {
          rowCells.push({
            rowModuleId: rowMod.id,
            colModuleId: colMod.id,
            cellType: "SELF",
            ruleSummary: null,
          });
          continue;
        }

        // Check if Col Course (courseId) requires Row Course (requiresCourseId)
        const prereqRule = ruleByTargetAndReq.get(`${colMod.courseId}:${rowMod.courseId}`);

        // Check if Row Course (courseId) requires Col Course (requiresCourseId)
        const dependentRule = ruleByTargetAndReq.get(`${rowMod.courseId}:${colMod.courseId}`);

        if (prereqRule) {
          const reqCourse = courseById.get(prereqRule.requiresCourseId);
          const lessonTitle = prereqRule.requiresLessonId
            ? (lessonTitles.get(prereqRule.requiresLessonId) ?? prereqRule.requiresLessonId)
            : null;

          const ruleSummary = lessonTitle
            ? `${rowMod.code} (${rowMod.title}) is required for ${colMod.code} (${colMod.title}) [Lesson: ${lessonTitle}]`
            : `${rowMod.code} (${rowMod.title}) is required for ${colMod.code} (${colMod.title}) [Whole course: ${reqCourse?.title ?? rowMod.courseTitle}]`;

          rowCells.push({
            rowModuleId: rowMod.id,
            colModuleId: colMod.id,
            cellType: "PREREQUISITE",
            ruleSummary,
            requiresCourseTitle: reqCourse?.title ?? rowMod.courseTitle,
            requiresLessonTitle: lessonTitle ?? undefined,
          });
        } else if (dependentRule) {
          const reqCourse = courseById.get(dependentRule.requiresCourseId);
          const lessonTitle = dependentRule.requiresLessonId
            ? (lessonTitles.get(dependentRule.requiresLessonId) ?? dependentRule.requiresLessonId)
            : null;

          const ruleSummary = lessonTitle
            ? `${rowMod.code} (${rowMod.title}) depends on ${colMod.code} (${colMod.title}) [Lesson: ${lessonTitle}]`
            : `${rowMod.code} (${rowMod.title}) depends on ${colMod.code} (${colMod.title}) [Whole course: ${reqCourse?.title ?? colMod.courseTitle}]`;

          rowCells.push({
            rowModuleId: rowMod.id,
            colModuleId: colMod.id,
            cellType: "DEPENDENT",
            ruleSummary,
            requiresCourseTitle: reqCourse?.title ?? colMod.courseTitle,
            requiresLessonTitle: lessonTitle ?? undefined,
          });
        } else {
          rowCells.push({
            rowModuleId: rowMod.id,
            colModuleId: colMod.id,
            cellType: "NONE",
            ruleSummary: null,
          });
        }
      }

      matrix.push(rowCells);
    }

    return Result.ok({
      modules: filteredModules,
      matrix,
      hasPrerequisites: rules.length > 0,
      totalPrerequisiteRules: rules.length,
    });
  }
}
